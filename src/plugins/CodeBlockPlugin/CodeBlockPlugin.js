// src/plugins/CodeBlockPlugin/CodeBlockPlugin.js
//
// Code block — VS Code-style chrome + zero-dependency syntax highlighting.
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  ⚡ JavaScript ▾                              ⟲ Format    ⧉ Copy │   ← header (contenteditable=false)
// ├──────────────────────────────────────────────────────────────────┤
// │   1│ function greet(name) {                                       │
// │   2│   return `Hello, ${name}!`;                                  │   ← gutter + code
// │   3│ }                                                             │
// └──────────────────────────────────────────────────────────────────┘
//
// Persisted DOM (after sanitize):
//   <figure class="penman-codeblock-figure" data-kind="codeblock"
//           data-language="javascript" contenteditable="false">
//     <pre class="penman-codeblock" dir="ltr">
//       <code class="code-block lang-javascript"
//             data-language="javascript" dir="ltr" contenteditable="true">…</code>
//     </pre>
//   </figure>
//
// Runtime DOM (after hydrate): the figure also contains a `.cb-header`
// and a `.cb-gutter`. Those are rebuilt on every load, so we don't have
// to teach the sanitizer about <button>s or random divs.
//
// Migration: pre.penman-codeblock blocks that pre-date this rewrite still
// work — hydrate() wraps them in a figure on first sight.

import { getTokens, formatCode } from './syntax/index.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

// ─── Language registry ─────────────────────────────────────────────────
// Single source of truth for both the toolbar dropdown and the per-block
// language switcher. Keep aliases in sync with syntax/index.js's grammars.
const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', short: 'JS'   },
  { id: 'html',       label: 'HTML',       short: 'HTML' },
  { id: 'css',        label: 'CSS',        short: 'CSS'  },
  { id: 'json',       label: 'JSON',       short: 'JSON' },
  { id: 'php',        label: 'PHP',        short: 'PHP'  },
  { id: 'bash',       label: 'Bash',       short: 'sh'   },
  { id: 'sql',        label: 'SQL',        short: 'SQL'  }
];

function labelFor(langId) {
  const l = LANGUAGES.find(x => x.id === langId);
  return l ? l.label : (langId || 'Plain');
}

// ─── Inline-injected styles for token colors (themed) ──────────────────
// We keep this here because the CodeBlockPlugin "owns" the token classes.
// The chrome (figure/header/gutter/etc.) lives in penman-ui.css so it can
// participate in the design-token system there.
const STYLE_ID = 'penman-syntax-styles';
function injectTokenStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Dark palette (default — One Dark Pro) */
    .penman-codeblock-figure .penman-token-keyword     { color: #c678dd; font-weight: 600; }
    .penman-codeblock-figure .penman-token-string      { color: #98c379; }
    .penman-codeblock-figure .penman-token-comment     { color: #5c6370; font-style: italic; }
    .penman-codeblock-figure .penman-token-number      { color: #d19a66; }
    .penman-codeblock-figure .penman-token-operator    { color: #56b6c2; }
    .penman-codeblock-figure .penman-token-punctuation { color: #abb2bf; }
    .penman-codeblock-figure .penman-token-function    { color: #61afef; }
    .penman-codeblock-figure .penman-token-class-name  { color: #e5c07b; }
    .penman-codeblock-figure .penman-token-tag         { color: #e06c75; }
    .penman-codeblock-figure .penman-token-attr-name   { color: #d19a66; }
    .penman-codeblock-figure .penman-token-attr-value  { color: #98c379; }
    .penman-codeblock-figure .penman-token-property    { color: #d19a66; }
    .penman-codeblock-figure .penman-token-selector    { color: #e06c75; }
    .penman-codeblock-figure .penman-token-variable    { color: #e06c75; }
    .penman-codeblock-figure .penman-token-builtin     { color: #56b6c2; }
    .penman-codeblock-figure .penman-token-regex       { color: #56b6c2; }

    /* Light palette (One Light) — applied via Penman's theme switch. */
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-keyword     { color: #a626a4; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-string      { color: #50a14f; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-comment     { color: #a0a1a7; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-number      { color: #986801; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-operator    { color: #0184bc; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-punctuation { color: #383a42; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-function    { color: #4078f2; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-class-name  { color: #c18401; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-tag         { color: #e45649; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-attr-name   { color: #986801; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-attr-value  { color: #50a14f; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-property    { color: #986801; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-selector    { color: #e45649; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-variable    { color: #e45649; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-builtin     { color: #0184bc; }
    :root[data-theme="light"] .penman-codeblock-figure .penman-token-regex       { color: #0184bc; }

    /* Legacy: keep the scoped pre background rule for plain pre.penman-codeblock
     * blocks that haven't been hydrated yet. The new figure-based chrome
     * paints its own surface via CSS variables, so this only matters
     * during the brief moment between insertion and hydrate(). */
    pre.penman-codeblock { background-color: #282c34 !important; overflow-x: auto !important; }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────
// Text + DOM utilities — selection/offset bookkeeping is identical to
// the previous implementation. The block-creation/structure code below
// is the new part.
// ─────────────────────────────────────────────────────────────────────────

function extractTextWithNewlines(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'br') {
    if (node.getAttribute('data-penman-ui') === 'true' && node === node.parentNode.lastChild) {
      return '';
    }
    return '\n';
  }
  let text = '';
  for (let child of node.childNodes) {
    text += extractTextWithNewlines(child);
  }
  return text;
}

function getCursorOffset(codeNode) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!codeNode.contains(range.endContainer)) return 0;
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(codeNode);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(preCaretRange.cloneContents());
  return tempDiv.textContent.length;
}

function setCursorOffset(codeNode, offset) {
  if (offset < 0) return;
  const sel = window.getSelection();
  const range = document.createRange();
  let charCount = 0;
  const walker = document.createTreeWalker(codeNode, NodeFilter.SHOW_TEXT, null, false);
  let node, found = false, lastTextNode = null;
  while ((node = walker.nextNode())) {
    lastTextNode = node;
    const length = node.nodeValue.length;
    if (offset <= charCount + length) {
      range.setStart(node, offset - charCount);
      range.collapse(true);
      found = true;
      break;
    }
    charCount += length;
  }
  if (!found && lastTextNode && charCount === offset) {
    range.setStart(lastTextNode, lastTextNode.nodeValue.length);
    range.collapse(true);
    found = true;
  }
  if (found) {
    const textToCursor = codeNode.textContent.substring(0, offset);
    if (textToCursor.endsWith('\n')) {
      const brs = codeNode.querySelectorAll('br[data-penman-ui="true"]');
      const br = brs[brs.length - 1];
      if (br && offset === codeNode.textContent.length) {
        range.setStartBefore(br);
        range.collapse(true);
      }
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function getSelectionOffsets(codeNode) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { start: 0, end: 0 };
  const range = sel.getRangeAt(0);
  const startRange = range.cloneRange();
  startRange.selectNodeContents(codeNode);
  startRange.setEnd(range.startContainer, range.startOffset);
  const startDiv = document.createElement('div');
  startDiv.appendChild(startRange.cloneContents());
  const start = startDiv.textContent.length;
  const endRange = range.cloneRange();
  endRange.selectNodeContents(codeNode);
  endRange.setEnd(range.endContainer, range.endOffset);
  const endDiv = document.createElement('div');
  endDiv.appendChild(endRange.cloneContents());
  const end = endDiv.textContent.length;
  return { start, end };
}

function setSelectionOffsets(codeNode, startOffset, endOffset) {
  if (startOffset < 0) startOffset = 0;
  if (endOffset < startOffset) endOffset = startOffset;
  const sel = window.getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(codeNode, NodeFilter.SHOW_TEXT, null, false);
  let node, charCount = 0, startFound = false, endFound = false, lastTextNode = null;
  while ((node = walker.nextNode())) {
    lastTextNode = node;
    const length = node.nodeValue.length;
    if (!startFound && startOffset <= charCount + length) {
      range.setStart(node, startOffset - charCount);
      startFound = true;
    }
    if (!endFound && endOffset <= charCount + length) {
      range.setEnd(node, endOffset - charCount);
      endFound = true;
      break;
    }
    charCount += length;
  }
  if (!startFound && lastTextNode) range.setStart(lastTextNode, lastTextNode.nodeValue.length);
  if (!endFound && lastTextNode) range.setEnd(lastTextNode, lastTextNode.nodeValue.length);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ─── Incremental DOM patcher (unchanged from previous impl) ─────────────

function patchDOM(codeNode, tokens) {
  let childNodes = Array.from(codeNode.childNodes);
  let trailingBR = null;
  if (childNodes.length > 0) {
    const last = childNodes[childNodes.length - 1];
    if (last.nodeName.toLowerCase() === 'br' && last.getAttribute('data-penman-ui') === 'true') {
      trailingBR = last;
      codeNode.removeChild(trailingBR);
      childNodes.pop();
    }
  }
  let nodeIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let existingNode = childNodes[nodeIndex];
    if (existingNode && existingNode.nodeType === Node.ELEMENT_NODE
        && existingNode.tagName.toLowerCase() === 'br') {
      const textNode = document.createTextNode('\n');
      codeNode.replaceChild(textNode, existingNode);
      existingNode = textNode;
      childNodes[nodeIndex] = textNode;
    }
    if (token.type === 'plain') {
      if (existingNode && existingNode.nodeType === Node.TEXT_NODE) {
        if (existingNode.nodeValue !== token.value) existingNode.nodeValue = token.value;
        nodeIndex++;
      } else {
        const textNode = document.createTextNode(token.value);
        if (existingNode) {
          codeNode.insertBefore(textNode, existingNode);
          childNodes.splice(nodeIndex, 0, textNode);
        } else {
          codeNode.appendChild(textNode);
          childNodes.push(textNode);
        }
        nodeIndex++;
      }
    } else {
      const className = `penman-token-${token.type}`;
      if (existingNode && existingNode.nodeType === Node.ELEMENT_NODE
          && existingNode.tagName.toLowerCase() === 'span'
          && existingNode.className === className) {
        if (existingNode.textContent !== token.value) existingNode.textContent = token.value;
        nodeIndex++;
      } else {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = token.value;
        if (existingNode) {
          codeNode.insertBefore(span, existingNode);
          childNodes.splice(nodeIndex, 0, span);
        } else {
          codeNode.appendChild(span);
          childNodes.push(span);
        }
        nodeIndex++;
      }
    }
  }
  while (nodeIndex < childNodes.length) {
    codeNode.removeChild(childNodes[nodeIndex]);
    nodeIndex++;
  }
  if (!trailingBR) {
    trailingBR = document.createElement('br');
    trailingBR.setAttribute('data-penman-ui', 'true');
  }
  codeNode.appendChild(trailingBR);
}

// ─── Block-level helpers ────────────────────────────────────────────────

function getCodeFromBlock(block) {
  if (!block) return null;
  return block.querySelector('code');
}

function getLanguage(block) {
  return (block && block.getAttribute('data-language'))
      || (getCodeFromBlock(block) && getCodeFromBlock(block).getAttribute('data-language'))
      || 'javascript';
}

function setLanguage(figure, lang) {
  figure.setAttribute('data-language', lang);
  const code = getCodeFromBlock(figure);
  if (code) {
    code.setAttribute('data-language', lang);
    code.className = `code-block lang-${lang}`;
  }
  const pill = figure.querySelector('.cb-lang-name');
  if (pill) pill.textContent = labelFor(lang);
}

// ─── Hydrate: re-attach chrome (header + gutter) to bare figures ────────

function hydrate(figure, editor) {
  if (figure.__cbHydrated) return;
  figure.__cbHydrated = true;
  figure.setAttribute('contenteditable', 'false');
  // Code is always rendered left-to-right, even inside an RTL editor.
  // This pins the gutter to the left side via flex order.
  figure.setAttribute('dir', 'ltr');
  if (!figure.classList.contains('penman-codeblock-figure')) {
    figure.classList.add('penman-codeblock-figure');
  }

  // ── Step 1: find or create the <pre><code>. ─────────────────────────
  // We tolerate any nesting (legacy data, half-hydrated state, anonymous
  // wrappers stripped by the sanitizer) by searching the whole subtree
  // and *not* assuming any specific ancestor chain.
  let pre = figure.querySelector('pre');
  if (!pre) {
    pre = document.createElement('pre');
    pre.className = 'penman-codeblock';
    pre.setAttribute('dir', 'ltr');
  } else if (!pre.classList.contains('penman-codeblock')) {
    pre.classList.add('penman-codeblock');
  }
  let code = pre.querySelector('code');
  if (!code) {
    code = document.createElement('code');
    pre.appendChild(code);
  }
  code.setAttribute('contenteditable', 'true');
  code.setAttribute('dir', 'ltr');
  const lang = getLanguage(figure);
  code.setAttribute('data-language', lang);
  if (!/\blang-/.test(code.className || '')) {
    code.className = `code-block lang-${lang}`;
  }
  figure.setAttribute('data-language', lang);
  figure.setAttribute('data-kind', 'codeblock');

  // ── Step 2: detach pre, wipe the figure, rebuild structure. ────────
  // Doing it in this order means we never depend on the existing DOM
  // shape (which may carry stray <div>s from sanitize, double wrappers
  // from a botched earlier hydrate, etc.) and we never call insertBefore
  // against a parent that doesn't actually contain the reference node.
  if (pre.parentNode) pre.parentNode.removeChild(pre);
  while (figure.firstChild) figure.removeChild(figure.firstChild);

  const header = buildHeader(lang, editor);
  figure.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cb-body';
  body.setAttribute('contenteditable', 'false');
  figure.appendChild(body);

  const gutter = document.createElement('div');
  gutter.className = 'cb-gutter';
  gutter.setAttribute('contenteditable', 'false');
  gutter.setAttribute('aria-hidden', 'true');
  body.appendChild(gutter);

  body.appendChild(pre);

  // Initial highlight + gutter sync.
  patchDOM(code, getTokens(code.textContent || '', lang));
  updateGutter(figure);
}

function buildHeader(lang, editor) {
  // Helper: look up an i18n string, with a safe fallback to the literal text.
  // i18n.t() returns the key itself when missing, so we explicitly check.
  const t = (key, fallback) => {
    if (!editor || !editor.i18n) return fallback;
    const val = editor.i18n.t(key);
    return val && val !== key ? val : fallback;
  };

  const header = document.createElement('div');
  header.className = 'cb-header';
  header.setAttribute('contenteditable', 'false');

  // Language pill (acts as a clickable dropdown)
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'cb-lang-pill';
  pill.setAttribute('data-cb-action', 'lang-toggle');
  pill.title = t('plugins.codeBlock.changeLanguage', 'Change language');
  pill.innerHTML = `
    <span class="cb-lang-dot"></span>
    <span class="cb-lang-name">${labelFor(lang)}</span>
    <svg class="cb-lang-caret" width="10" height="10" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  `;
  header.appendChild(pill);

  const actions = document.createElement('div');
  actions.className = 'cb-actions';

  // Format
  const fmt = document.createElement('button');
  fmt.type = 'button';
  fmt.className = 'cb-action';
  fmt.setAttribute('data-cb-action', 'format');
  fmt.title = t('plugins.codeBlock.format', 'Format');
  fmt.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="15" y2="12"/>
      <line x1="3" y1="18" x2="18" y2="18"/>
    </svg>
  `;
  actions.appendChild(fmt);

  // Copy
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'cb-action';
  copy.setAttribute('data-cb-action', 'copy');
  copy.title = t('plugins.codeBlock.copy', 'Copy');
  copy.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  `;
  actions.appendChild(copy);

  // Delete (destructive — requires confirmation modal)
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'cb-action cb-action--danger';
  del.setAttribute('data-cb-action', 'delete');
  del.title = t('plugins.codeBlock.delete', 'Delete code block');
  // Use an explicit aria-label so screen readers announce the action even
  // when the SVG-only button has no text content.
  del.setAttribute('aria-label', t('plugins.codeBlock.delete', 'Delete code block'));
  del.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"/>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  `;
  actions.appendChild(del);

  header.appendChild(actions);
  return header;
}

function updateGutter(figure) {
  const gutter = figure.querySelector(':scope > .cb-body > .cb-gutter');
  const code = getCodeFromBlock(figure);
  if (!gutter || !code) return;
  const text = code.textContent || '';
  // Count visual lines — trailing prop BR isn't a "line", so trim its empty.
  let lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const count = Math.max(1, lines.length);
  // Only rebuild when the line count actually changed.
  if (gutter.__cbCount === count) return;
  gutter.__cbCount = count;
  let html = '';
  for (let i = 1; i <= count; i++) html += `<span class="cb-ln">${i}</span>`;
  gutter.innerHTML = html;
}

// Find every codeblock-shaped node and run hydrate() on it. Also wraps
// legacy `pre.penman-codeblock` blocks (no figure parent yet) inside a
// fresh figure first so they pick up the new chrome.
function rehydrateAll(root, editor) {
  // 1. Wrap orphan pre.penman-codeblock in a figure.
  //
  // We compute "is this pre already inside a code-block figure?" in JS
  // rather than via :not(.penman-codeblock-figure > pre) — the latter
  // relies on CSS Level 4 selector support, which isn't universal yet.
  const allPres = root.querySelectorAll('pre.penman-codeblock');
  allPres.forEach((pre) => {
    if (pre.closest('figure[data-kind="codeblock"]')) return; // already wrapped
    const codeChild = pre.querySelector('code');
    const lang = (codeChild && codeChild.getAttribute('data-language')) || 'javascript';
    const figure = document.createElement('figure');
    figure.className = 'penman-codeblock-figure';
    figure.setAttribute('data-kind', 'codeblock');
    figure.setAttribute('data-language', lang);
    pre.parentNode.replaceChild(figure, pre);
    figure.appendChild(pre);
  });

  // 2. Hydrate every figure. hydrate() now always rebuilds the figure's
  //    structure from scratch (using only the <pre> as its anchor), so
  //    we don't have to detect "is this a sanitized half-state" here.
  //    We just flag every figure as needing a fresh pass.
  const figures = root.querySelectorAll('figure[data-kind="codeblock"]');
  figures.forEach((f) => {
    // If the figure still has our header, it's fully hydrated — skip to
    // avoid clobbering selection / scroll position on every refresh tick.
    if (f.__cbHydrated && f.querySelector(':scope > .cb-header')) return;
    f.__cbHydrated = false;
    hydrate(f, editor);
  });
}

// ─── Self-healing patch (now scoped to a code element) ──────────────────

function healAndPatch(codeNode) {
  if (!codeNode) return;
  const figure = codeNode.closest('figure[data-kind="codeblock"]');
  const offset = getCursorOffset(codeNode);
  const rawText = extractTextWithNewlines(codeNode) || '';
  // Re-tokenize and patch.
  const lang = (figure && getLanguage(figure)) || codeNode.getAttribute('data-language') || 'javascript';
  patchDOM(codeNode, getTokens(rawText, lang));
  setCursorOffset(codeNode, offset);
  if (figure) updateGutter(figure);
}

// ─── Insertion / removal commands ───────────────────────────────────────

function findEnclosingCode(editor) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.getRangeAt(0).startContainer;
  while (node && node !== editor.editableArea) {
    if (node.nodeType === 1 && node.tagName.toLowerCase() === 'code'
        && node.closest('figure[data-kind="codeblock"]')) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}

function insertCodeBlock(editor, language = 'javascript') {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  // Locate the block that contains the caret. We replace it with a fresh
  // figure (or insert before, if the block is non-empty).
  const range = sel.getRangeAt(0);
  let blockNode = range.commonAncestorContainer;
  if (blockNode.nodeType === 3) blockNode = blockNode.parentNode;
  while (blockNode && blockNode !== editor.editableArea
         && (!editor.sanitizer || !editor.sanitizer.blockTags.has(blockNode.tagName.toLowerCase()))) {
    blockNode = blockNode.parentNode;
  }
  if (!blockNode || blockNode === editor.editableArea) return;

  const figure = document.createElement('figure');
  figure.className = 'penman-codeblock-figure';
  figure.setAttribute('data-kind', 'codeblock');
  figure.setAttribute('data-language', language);
  figure.setAttribute('contenteditable', 'false');

  const pre = document.createElement('pre');
  pre.className = 'penman-codeblock';
  pre.setAttribute('dir', 'ltr');

  const code = document.createElement('code');
  code.className = `code-block lang-${language}`;
  code.setAttribute('data-language', language);
  code.setAttribute('dir', 'ltr');
  code.setAttribute('contenteditable', 'true');
  code.textContent = blockNode.textContent || '';

  pre.appendChild(code);
  figure.appendChild(pre);
  blockNode.parentNode.replaceChild(figure, blockNode);

  hydrate(figure, editor);

  // Move caret to end of code.
  const r = document.createRange();
  r.selectNodeContents(code);
  r.collapse(false);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);

  if (editor.history) editor.history.pushImmediate();
}

function exitCodeBlock(editor, codeNode) {
  const figure = codeNode.closest('figure[data-kind="codeblock"]');
  if (!figure) return;
  const p = document.createElement('p');
  const text = codeNode.textContent || '';
  if (text.includes('\n')) {
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      p.appendChild(document.createTextNode(line));
      if (idx < lines.length - 1) p.appendChild(document.createElement('br'));
    });
  } else {
    p.textContent = text;
  }
  if (p.innerHTML === '') p.innerHTML = '<br>';
  figure.parentNode.replaceChild(p, figure);

  const newSel = window.getSelection();
  newSel.removeAllRanges();
  const r = document.createRange();
  r.selectNodeContents(p);
  r.collapse(false);
  newSel.addRange(r);
  if (editor.history) editor.history.pushImmediate();
}

// ─── Setup ──────────────────────────────────────────────────────────────

export function setupCodeBlockPlugin(editor) {
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.codeBlock', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  // Allow <figure data-kind="codeblock" data-language="…"> to survive
  // sanitization. Without data-language we can't restore the right
  // grammar on load.
  if (editor.sanitizer && editor.sanitizer.allowedTags) {
    const figAttrs = editor.sanitizer.allowedTags.figure || [];
    if (figAttrs.indexOf('data-language') < 0) figAttrs.push('data-language');
    editor.sanitizer.allowedTags.figure = figAttrs;
    if (typeof editor.sanitizer._buildDynamicWhitelist === 'function') {
      try { editor.sanitizer._buildDynamicWhitelist(); } catch (_) { /* noop */ }
    }
  }

  injectTokenStyles();

  // Toolbar entry — a dropdown of all languages. Selecting one inserts a
  // block in that language; clicking the trigger with no selection also
  // inserts with the default (JS). Penman's addDropdown handles both.
  //
  // Note: for dropdowns, UIManager reads `icon` (raw HTML) — not
  // `iconName` like it does for plain buttons. We pull the SVG out of
  // the iconProvider (which we registered above) so the trigger shows
  // the codeblock glyph instead of falling back to the text label.
  // `text` is kept for the tooltip / a11y title only.
  editor.ui.registry.addDropdown('codeblock', {
    icon: (editor.ui.iconProvider && editor.ui.iconProvider.getIcon('codeblock')) || __icons.codeblock,
    text: editor.i18n.t('plugins.codeBlock.title') || 'Code Block',
    title: editor.i18n.t('plugins.codeBlock.title') || 'Code Block',
    render: () => {
      // Re-use the BlockType plugin's list classes so we inherit Penman's
      // dropdown styling for free (padding, hover, dark-mode, RTL flip).
      const panel = document.createElement('div');
      panel.className = 'penman-blocktype-list cb-lang-list';
      LANGUAGES.forEach((lang) => {
        const item = document.createElement('div');
        item.className = 'penman-blocktype-item';
        item.setAttribute('data-cb-lang', lang.id);
        item.innerHTML = `
          <span class="cb-lang-name">${lang.label}</span>
          <span class="cb-lang-short">${lang.short}</span>
        `;
        item.addEventListener('mousedown', (e) => e.preventDefault());
        item.addEventListener('click', (e) => {
          e.preventDefault();
          document.body.click(); // close the dropdown
          editor.commands.execute('INSERT_CODEBLOCK', { language: lang.id });
        });
        panel.appendChild(item);
      });
      return panel;
    }
  });

  editor.commands.register('INSERT_CODEBLOCK', {
    execute: (e, payload) => {
      // Called from toolbar (with payload) or via toggle (no payload).
      // Toggle behaviour: if caret is inside a code block, exit it.
      const inside = findEnclosingCode(editor);
      if (inside && !payload) { exitCodeBlock(editor, inside); return; }
      const lang = (payload && payload.language) || 'javascript';
      insertCodeBlock(editor, lang);
    }
  });

  // ─── Input → real-time highlight + gutter ─────────────────────────────
  editor.editableArea.addEventListener('input', () => {
    const code = findEnclosingCode(editor);
    if (code) healAndPatch(code);
  });

  // ─── Keydown shortcuts ──────────────────────────────────────────────
  editor.editableArea.addEventListener('keydown', (e) => {
    const code = findEnclosingCode(editor);
    if (!code) return;
    const figure = code.closest('figure[data-kind="codeblock"]');

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const offset = getCursorOffset(code);
      const text = code.textContent || '';
      const sel = window.getSelection();
      if (sel.isCollapsed && text.length === 0) {
        e.preventDefault();
        exitCodeBlock(editor, code);
        return;
      }
      if ((e.key === 'Backspace' && offset === 0 && sel.isCollapsed)
       || (e.key === 'Delete'    && offset === text.length && sel.isCollapsed)) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection();
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(code);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const lines = preCaretRange.toString().split('\n');
      const lastLine = lines[lines.length - 1];
      const indent = (lastLine.match(/^(\s*)/) || ['', ''])[1];
      const textNode = document.createTextNode('\n' + indent);
      range.deleteContents();
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      healAndPatch(code);
      if (editor.history) editor.history.pushImmediate();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const { start, end } = getSelectionOffsets(code);
      let text = code.textContent || '';
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;
      let block = text.substring(lineStart, lineEnd);
      let lines = block.split('\n');
      let newStart = start, newEnd = end;
      if (e.shiftKey) {
        for (let i = 0; i < lines.length; i++) {
          let take = 0;
          if (lines[i].startsWith('  ')) take = 2;
          else if (lines[i].startsWith(' ')) take = 1;
          if (take > 0) {
            lines[i] = lines[i].substring(take);
            if (i === 0) newStart = Math.max(lineStart, newStart - take);
            newEnd -= take;
          }
        }
      } else if (start === end) {
        text = text.substring(0, start) + '  ' + text.substring(start);
        newStart += 2; newEnd += 2;
        patchDOM(code, getTokens(text, getLanguage(figure)));
        setSelectionOffsets(code, newStart, newEnd);
        if (figure) updateGutter(figure);
        if (editor.history) editor.history.pushImmediate();
        return;
      } else {
        for (let i = 0; i < lines.length; i++) {
          lines[i] = '  ' + lines[i];
          if (i === 0) newStart += 2;
          newEnd += 2;
        }
      }
      if (start !== end || e.shiftKey) {
        const newBlock = lines.join('\n');
        text = text.substring(0, lineStart) + newBlock + text.substring(lineEnd);
        patchDOM(code, getTokens(text, getLanguage(figure)));
        setSelectionOffsets(code, newStart, newEnd);
        if (figure) updateGutter(figure);
        if (editor.history) editor.history.pushImmediate();
      }
    }
  }, true);

  // ─── Paste → plain-text + auto-format ───────────────────────────────
  editor.editableArea.addEventListener('paste', (e) => {
    const code = findEnclosingCode(editor);
    if (!code) return;
    e.preventDefault();
    e.stopPropagation();
    const data = (e.originalEvent || e).clipboardData;
    let text = data.getData('text/plain');
    if (!text) return;
    text = text.replace(/\r\n/g, '\n');
    const figure = code.closest('figure[data-kind="codeblock"]');
    const lang = getLanguage(figure);
    text = formatCode(text, lang);
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tn = document.createTextNode(text);
    range.insertNode(tn);
    range.setStartAfter(tn);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    healAndPatch(code);
    if (editor.history) editor.history.pushImmediate();
  }, true);

  // ─── Header action delegation (copy / format / lang switch) ─────────
  editor.editableArea.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-cb-action]');
    if (!actionEl) return;
    const figure = actionEl.closest('figure[data-kind="codeblock"]');
    if (!figure) return;
    const code = getCodeFromBlock(figure);
    if (!code) return;
    const action = actionEl.getAttribute('data-cb-action');
    e.preventDefault();
    e.stopPropagation();

    if (action === 'copy') {
      const text = code.textContent || '';
      const done = () => flashAction(actionEl, '✓');
      const fail = () => flashAction(actionEl, '✗');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        // Legacy fallback
        try {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy');
          ta.remove(); done();
        } catch (_) { fail(); }
      }
      return;
    }
    if (action === 'format') {
      const lang = getLanguage(figure);
      const formatted = formatCode(code.textContent || '', lang);
      code.textContent = formatted;
      patchDOM(code, getTokens(formatted, lang));
      updateGutter(figure);
      if (editor.history) editor.history.pushImmediate();
      flashAction(actionEl, '✓');
      return;
    }
    if (action === 'lang-toggle') {
      openLangPicker(actionEl, figure, (newLang) => {
        setLanguage(figure, newLang);
        const c = getCodeFromBlock(figure);
        if (c) patchDOM(c, getTokens(c.textContent || '', newLang));
        if (editor.history) editor.history.pushImmediate();
      });
      return;
    }
    if (action === 'delete') {
      openDeleteConfirm(editor, figure);
      return;
    }
  });

  // ─── Re-hydrate on every load / content swap / focus ─────────────────
  const refresh = () => rehydrateAll(editor.editableArea, editor);
  if (typeof editor.on === 'function') {
    editor.on('change', refresh);
    editor.on('selectionChange', refresh);
  }
  // Initial pass (covers content set via setContent before plugin init,
  // and legacy data already on the page).
  setTimeout(refresh, 0);
}

// ─── Delete confirmation modal ──────────────────────────────────────────
//
// Destructive action — we always require explicit confirmation. The modal
// uses the editor's own UI primitives (createFormModal) so it inherits
// dark-mode/RTL styling and the accent button styles for free.
function openDeleteConfirm(editor, figure) {
  if (!figure || !figure.parentNode) return;
  // Bail out if the modal helper isn't wired up (tests / headless envs).
  if (!editor || !editor.ui || typeof editor.ui.createFormModal !== 'function') return;

  // i18n helper with explicit-fallback semantics: i18n.t() returns the key
  // itself for unknown keys, which would look like garbage in the UI.
  const t = (key, fallback) => {
    if (!editor.i18n) return fallback;
    const v = editor.i18n.t(key);
    return v && v !== key ? v : fallback;
  };

  const title  = t('plugins.codeBlock.deleteConfirmTitle',   'Delete code block');
  const msg    = t('plugins.codeBlock.deleteConfirmMessage',
                   'Are you sure you want to delete this code block?');
  const okText = t('plugins.codeBlock.deleteAction', t('ui.delete', 'Delete'));
  const cancel = t('ui.cancel', 'Cancel');

  // Minimal, escape-safe body. The message is user-facing translated copy,
  // so we trust it — but render it inside a <p> rather than concatenating
  // any user-derived strings.
  const formModal = editor.ui.createFormModal({
    title,
    fields: [
      { type: 'html', html: `<p class="penman-confirm-message">${msg}</p>` }
    ],
    hideFooter: false,
    buttons: [
      {
        text: cancel,
        align: 'left',
        onClick: (_e, modal) => modal.close()
      },
      {
        text: okText,
        // .penman-btn-danger gives red destructive colouring; we keep the
        // primary class off so the OK isn't visually mistaken for "safe".
        classNames: 'penman-btn-danger',
        onClick: (_e, modal) => {
          performCodeBlockDelete(editor, figure);
          modal.close();
        }
      }
    ]
  });

  return formModal;
}

// Actually delete the figure and leave the editor in a sane state:
// the deleted block is replaced by an empty paragraph so the caret has
// somewhere to land, and history gets a snapshot so the user can undo.
function performCodeBlockDelete(editor, figure) {
  if (!figure || !figure.parentNode) return;

  const parent = figure.parentNode;
  const placeholder = document.createElement('p');
  placeholder.innerHTML = '<br>';
  parent.replaceChild(placeholder, figure);

  // Move caret into the placeholder.
  try {
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.setStart(placeholder, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch (_) { /* selection APIs can throw in detached frames */ }

  if (editor.history && typeof editor.history.pushImmediate === 'function') {
    editor.history.pushImmediate();
  }
  if (typeof editor.emit === 'function' && typeof editor.getContent === 'function') {
    editor.emit('change', editor.getContent());
  }
}

// ─── In-place language picker (small floating menu) ─────────────────────

function openLangPicker(anchor, figure, onPick) {
  // Remove any previously-open picker first.
  document.querySelectorAll('.cb-lang-picker').forEach((p) => p.remove());

  const picker = document.createElement('div');
  picker.className = 'cb-lang-picker';
  LANGUAGES.forEach((lang) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cb-lang-picker-item';
    btn.textContent = lang.label;
    if (getLanguage(figure) === lang.id) btn.classList.add('is-active');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick(lang.id);
      picker.remove();
    });
    picker.appendChild(btn);
  });

  // Position under the anchor button.
  const rect = anchor.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.top = `${rect.bottom + 4}px`;
  picker.style.left = `${rect.left}px`;
  picker.style.zIndex = '9999';
  document.body.appendChild(picker);

  // Dismiss on outside click / ESC.
  const dismiss = (ev) => {
    if (ev.type === 'keydown' && ev.key !== 'Escape') return;
    if (ev.type === 'click' && picker.contains(ev.target)) return;
    picker.remove();
    document.removeEventListener('click', dismiss, true);
    document.removeEventListener('keydown', dismiss, true);
  };
  setTimeout(() => {
    document.addEventListener('click', dismiss, true);
    document.addEventListener('keydown', dismiss, true);
  }, 0);
}

// Quick visual feedback on action buttons after a successful op.
function flashAction(btn, glyph) {
  const orig = btn.innerHTML;
  btn.classList.add('is-success');
  btn.innerHTML = `<span class="cb-action-glyph">${glyph}</span>`;
  setTimeout(() => {
    btn.classList.remove('is-success');
    btn.innerHTML = orig;
  }, 900);
}

export { getCursorOffset, setCursorOffset };
