/**
 * BidiIsolatePlugin
 * ────────────────────────────────────────────────────────────────────────
 * Wraps runs of LTR letters (plus the punctuation / spaces / digits that
 * are immediately attached to them) in `<bdi dir="ltr">` so that, inside
 * an RTL paragraph, an English word and its trailing punctuation stay
 * together visually instead of being shuffled by the Unicode Bidi
 * Algorithm's neutral-resolution step.
 *
 * Concretely, this turns:
 *
 *     <p>این یک متن javascript! است</p>
 *
 * into:
 *
 *     <p>این یک متن <bdi dir="ltr">javascript!</bdi> است</p>
 *
 * so the "!" stays glued to "javascript" instead of "است".
 *
 * The plugin runs on the editor's `input` event with a small debounce,
 * skips work during IME composition, and preserves the caret by
 * recording its character offset before the rewrap and restoring it
 * after. The replacement is also tagged so our own DOM mutations don't
 * re-enter the handler.
 *
 * Trade-offs the plugin is aware of:
 *
 *   • It's a structural change to the editor's content. Other plugins
 *     that operate on text nodes (search, find/replace) keep working
 *     because text content is preserved character-for-character — only
 *     the DOM structure changes.
 *
 *   • Undo history sees the rewrap as a single edit. The debounce
 *     coalesces typing bursts so undo "feels right" rather than rewinding
 *     one auto-wrap at a time.
 *
 *   • The Sanitizer's allow-list is extended at plugin-init time to let
 *     `<bdi>` survive serialise/restore round-trips (paste, history,
 *     getContent/setContent).
 */

// Character ranges that the Unicode Bidi Algorithm treats as STRONG_RTL.
// (Hebrew, Arabic, Syriac, NKo, Mandaic, Hanifi Rohingya, etc.)
const RTL_LETTER_RE =
  /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿߀-߿ࠀ-࠿ࡀ-࡟ࡠ-࡯ࡰ-࢟ࢠ-ࣿיִ-﷿ﹰ-﻿]/;

// We treat ASCII letters and the Latin-1 supplement / extensions as LTR
// "strong" enough to anchor a run. We intentionally do NOT include digits
// here — digits are NEUTRALS that should follow whichever side they're
// touching.
const LTR_LETTER_RE = /[A-Za-zÀ-ɏḀ-ỿ]/;

// Block-level elements that contain editable prose. We rewrap inside
// these. Tables and figures recurse via their interior block elements.
const REWRAP_BLOCK_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, figcaption';

const DEBOUNCE_MS = 280;

export function setupBidiIsolatePlugin(editor) {
  if (!editor || !editor.editableArea) return;

  // ─── Extend the sanitizer allow-list so <bdi> survives round-trips. ──
  if (editor.sanitizer && editor.sanitizer.allowedTags) {
    editor.sanitizer.allowedTags.bdi = ['dir'];
    if (typeof editor.sanitizer._buildDynamicWhitelist === 'function') {
      // Some sanitizer implementations cache a derived whitelist — rebuild.
      try { editor.sanitizer._buildDynamicWhitelist(); } catch (_) { /* noop */ }
    }
  }

  let debounceTimer = null;
  let suppressInput = false;     // true while WE are mutating the DOM
  let composing = false;         // true between compositionstart/end

  function rewrap() {
    if (suppressInput || composing) return;
    suppressInput = true;
    try {
      rewrapEditorContent(editor.editableArea);
    } finally {
      // Allow a microtask gap so the synthetic input from our mutations
      // is observed AFTER the flag flips back — we want it ignored too.
      setTimeout(() => { suppressInput = false; }, 0);
    }
  }

  function schedule() {
    if (suppressInput || composing) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rewrap, DEBOUNCE_MS);
  }

  // Allow-list of InputEvent.inputType values that actually introduce text
  // content. Anything else (Enter, deletion, undo, formatting commands) does
  // not produce new LTR runs that need bidi wrapping, AND triggering a
  // rewrap on those events corrupts the caret: our caret save/restore is
  // character-offset-based, and when the cursor lands inside a freshly
  // created empty block (e.g. right after Enter) that offset is ambiguous
  // — it collapses to the end of the previous block, causing the
  // user-visible "I press Enter, cursor goes to the next line, then jumps
  // back to the previous line" bug. Filtering here is the standard fix:
  // only react to events that justify the rewrap cost.
  const INSERTS_TEXT = new Set([
    'insertText',
    'insertCompositionText',
    'insertReplacementText',
    'insertFromPaste',
    'insertFromPasteAsQuotation',
    'insertFromDrop',
    'insertFromYank',
    'insertTranspose'
  ]);

  const onInput = (e) => {
    // Some synthetic events lack inputType — treat them as "unknown", which
    // we deliberately ignore rather than blindly rewrapping. The plugin's
    // initial pass (and the explicit paste handler below) cover the cases
    // that don't go through the input event.
    if (!e || !e.inputType) return;
    if (INSERTS_TEXT.has(e.inputType)) schedule();
  };
  const onCompositionStart = () => { composing = true; };
  const onCompositionEnd = () => {
    composing = false;
    // Re-run once the IME commits — that's the moment we have a final
    // string to isolate.
    schedule();
  };
  const onPaste = () => {
    // Pastes can drop a whole sentence at once; rewrap immediately rather
    // than wait for the debounce.
    setTimeout(rewrap, 0);
  };

  editor.editableArea.addEventListener('input', onInput);
  editor.editableArea.addEventListener('compositionstart', onCompositionStart);
  editor.editableArea.addEventListener('compositionend', onCompositionEnd);
  editor.editableArea.addEventListener('paste', onPaste);

  if (typeof editor.on === 'function') {
    editor.on('destroy', () => {
      clearTimeout(debounceTimer);
      editor.editableArea.removeEventListener('input', onInput);
      editor.editableArea.removeEventListener('compositionstart', onCompositionStart);
      editor.editableArea.removeEventListener('compositionend', onCompositionEnd);
      editor.editableArea.removeEventListener('paste', onPaste);
    });
  }

  // Initial pass for pre-existing content (loaded HTML).
  // Defer to give plugins/initialisers a chance to settle.
  setTimeout(rewrap, 0);
}

// ─── Core rewrap pass ───────────────────────────────────────────────────

function rewrapEditorContent(root) {
  // 1. Capture caret as a character offset (and end-offset for a range).
  const saved = captureSelection(root);

  // 2. First, unwrap any existing <bdi> we (or a previous pass) created.
  //    Text characters are preserved exactly, so the offset stays valid.
  unwrapBdi(root);

  // 3. For each block, walk its descendant text nodes and re-wrap runs.
  const blocks = root.querySelectorAll(REWRAP_BLOCK_SELECTOR);
  blocks.forEach(rewrapBlock);
  // If the editor root itself has direct text children (rare but possible
  // for legacy content), rewrap it too.
  if (hasDirectTextChild(root)) rewrapBlock(root);

  // 4. Restore caret.
  restoreSelection(root, saved);
}

function unwrapBdi(root) {
  const nodes = root.querySelectorAll('bdi');
  nodes.forEach((bdi) => {
    const parent = bdi.parentNode;
    if (!parent) return;
    while (bdi.firstChild) parent.insertBefore(bdi.firstChild, bdi);
    parent.removeChild(bdi);
    // Merge adjacent text nodes that we just split.
    parent.normalize();
  });
}

function rewrapBlock(block) {
  // Gather all text nodes inside this block — but stop at descendant
  // block-level elements (those get their own pass), and skip text inside
  // <code> / <pre> where bidi shouldn't be touched.
  const textNodes = [];
  collectTextNodes(block, textNodes, block);
  for (const t of textNodes) rewrapTextNode(t);
}

function collectTextNodes(node, out, originBlock) {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 3 /* TEXT_NODE */) {
      if (c.nodeValue && c.nodeValue.length > 0) out.push(c);
      continue;
    }
    if (c.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const tag = c.tagName;
    if (tag === 'BDI') continue;       // already handled / about to be re-handled
    if (tag === 'CODE' || tag === 'PRE') continue; // do not bidi-touch code
    // Stop at nested blocks — they'll be processed in their own pass.
    if (c !== originBlock && c.matches && c.matches(REWRAP_BLOCK_SELECTOR)) continue;
    collectTextNodes(c, out, originBlock);
  }
}

function hasDirectTextChild(el) {
  for (let c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 3 && c.nodeValue && c.nodeValue.trim().length > 0) return true;
  }
  return false;
}

function rewrapTextNode(text) {
  const str = text.nodeValue;
  if (!str) return;

  // Split the text into alternating "runs" using STRONG_RTL letters as
  // boundary markers. A maximal non-RTL chunk that contains at least one
  // LTR-strong letter becomes an `<bdi>`; otherwise the chunk stays as a
  // plain text node.
  const segments = splitByDirection(str);
  if (segments.length === 1 && segments[0].type !== 'ltr') return;
  // Pure-LTR (e.g. "Hello world.") still gets a single bdi — useful in
  // mixed paragraphs but harmless even in pure-English paragraphs.

  const frag = document.createDocumentFragment();
  for (const seg of segments) {
    if (seg.type === 'ltr') {
      const bdi = document.createElement('bdi');
      bdi.setAttribute('dir', 'ltr');
      bdi.appendChild(document.createTextNode(seg.text));
      frag.appendChild(bdi);
    } else {
      frag.appendChild(document.createTextNode(seg.text));
    }
  }
  text.parentNode.replaceChild(frag, text);
}

function splitByDirection(str) {
  // Walk the string and break it on STRONG_RTL letters. Everything
  // between RTL letters is one "chunk"; we then classify each chunk as
  // 'ltr' (contains a strong LTR letter) or 'neutral' (only whitespace,
  // punctuation, digits — no strong letter at all).
  const out = [];
  let buf = '';
  let bufHasLtr = false;
  let rtlBuf = '';

  function flushBuf() {
    if (!buf) return;
    out.push({ type: bufHasLtr ? 'ltr' : 'neutral', text: buf });
    buf = '';
    bufHasLtr = false;
  }
  function flushRtl() {
    if (!rtlBuf) return;
    out.push({ type: 'rtl', text: rtlBuf });
    rtlBuf = '';
  }

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (RTL_LETTER_RE.test(ch)) {
      flushBuf();
      rtlBuf += ch;
    } else {
      flushRtl();
      if (LTR_LETTER_RE.test(ch)) bufHasLtr = true;
      buf += ch;
    }
  }
  flushBuf();
  flushRtl();

  return out;
}

// ─── Selection (caret) preservation ─────────────────────────────────────

/**
 * Capture the current selection as character offsets into `root.textContent`.
 * The textContent of `root` is unchanged by our rewrap (we only restructure
 * the DOM, never insert/remove characters), so these offsets remain valid
 * after the rewrap and can be turned back into a Range.
 */
function captureSelection(root) {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection && window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) {
    return null;
  }
  return {
    start: nodeOffsetToCharOffset(root, r.startContainer, r.startOffset),
    end:   nodeOffsetToCharOffset(root, r.endContainer,   r.endOffset)
  };
}

function restoreSelection(root, saved) {
  if (!saved) return;
  if (saved.start < 0 || saved.end < 0) return;
  const startPos = charOffsetToNodeOffset(root, saved.start);
  const endPos   = charOffsetToNodeOffset(root, saved.end);
  if (!startPos || !endPos) return;
  try {
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (_) { /* selection restoration is best-effort */ }
}

/**
 * Convert (node, offset) to a character offset into root.textContent.
 * For element nodes, offset is the child index; we sum the textContent
 * lengths of all preceding children to get the equivalent char index.
 */
function nodeOffsetToCharOffset(root, node, offset) {
  if (node === root && node.nodeType === 1) {
    // Offset is a child index into root — sum textContent up to that child.
    let total = 0;
    for (let i = 0; i < offset && i < node.childNodes.length; i++) {
      total += (node.childNodes[i].textContent || '').length;
    }
    return total;
  }
  // Walk root's text nodes in order; accumulate length until we hit `node`.
  let count = 0;
  let target = -1;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    if (n === node) {
      target = count + offset;
      break;
    }
    count += n.nodeValue.length;
  }
  if (target >= 0) return target;
  // If `node` is an element node (e.g. caret at end of <br>), find the
  // count of textContent up to and including this element.
  if (node.nodeType === 1) {
    // Sum textContent of all text nodes that come before `node` in DOM order.
    let total = 0;
    const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let t;
    while ((t = w2.nextNode())) {
      const cmp = node.compareDocumentPosition(t);
      if (cmp & Node.DOCUMENT_POSITION_PRECEDING) total += t.nodeValue.length;
    }
    return total;
  }
  return -1;
}

/**
 * Convert a character offset into root.textContent back into a (node, offset)
 * pair that can seed a Range. Lands on the text node that contains the
 * requested character; if the offset falls between text nodes (e.g. across
 * a freshly-inserted <bdi>), prefers the text node that comes after.
 */
function charOffsetToNodeOffset(root, charOffset) {
  if (charOffset < 0) return null;
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n;
  let last = null;
  while ((n = walker.nextNode())) {
    const len = n.nodeValue.length;
    if (count + len >= charOffset) {
      return { node: n, offset: charOffset - count };
    }
    count += len;
    last = n;
  }
  // Offset is past end → clamp to end of last text node, or root if empty.
  if (last) return { node: last, offset: last.nodeValue.length };
  return { node: root, offset: 0 };
}
