/**
 * Native, selection-based replacements for the legacy `document.execCommand`
 * API. Browsers have deprecated execCommand and may remove it in future
 * releases, so the editor migrates the most fragile call sites first:
 *
 *   - insertHTMLAtSelection: replaces execCommand('insertHTML', ...)
 *   - insertTextAtSelection: replaces execCommand('insertText', ...)
 *   - toggleInlineWrap:      replaces execCommand('bold'|'italic'|...)
 *   - removeInlineFormatting: replaces execCommand('removeFormat')
 *
 * Each helper restores the selection to a sensible position after mutation so
 * callers don't have to coordinate selection bookkeeping.
 *
 * NOTE: These helpers assume the live document selection is inside the editor
 * (callers should `editor.selection.restore()` first). They operate on the
 * standard Selection / Range APIs and therefore work in every modern browser
 * without relying on execCommand.
 */

/**
 * Inserts a fragment of HTML at the current selection. If the selection is
 * non-collapsed, its contents are first deleted.
 *
 * The new content is parsed via DOMParser (in the same security context as
 * the editor's sanitizer) and inserted as a DocumentFragment, then the
 * selection collapses to the end of the inserted content.
 *
 * @param {string} html
 * @returns {Range|null} the range covering the inserted content, or null if
 *   nothing could be inserted (no live selection).
 */
export function insertHTMLAtSelection(html) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  // Parse the HTML into a fragment without executing scripts. The browser
  // strips scripts when adopting nodes via DOMParser + adoptNode, but we
  // additionally remove any <script> tags defensively.
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script').forEach(s => s.remove());
  const fragment = template.content;

  // Remember the last inserted node so we can position the cursor after it.
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    const after = document.createRange();
    after.setStartAfter(lastNode);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    return after;
  }
  return range;
}

/**
 * Inserts plain text at the selection, replacing any selected content. Treats
 * "\n" as a soft line break (<br>). For block-level breaks the caller should
 * insert explicit paragraph markup via insertHTMLAtSelection.
 *
 * @param {string} text
 */
export function insertTextAtSelection(text) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  range.deleteContents();

  if (text.indexOf('\n') === -1) {
    const node = document.createTextNode(text);
    range.insertNode(node);
    const after = document.createRange();
    after.setStartAfter(node);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    return after;
  }

  // Multi-line text: split on newlines and intersperse <br> elements.
  const fragment = document.createDocumentFragment();
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.length > 0) {
      fragment.appendChild(document.createTextNode(line));
    }
    if (i < lines.length - 1) {
      fragment.appendChild(document.createElement('br'));
    }
  });

  const lastChild = fragment.lastChild;
  range.insertNode(fragment);
  if (lastChild) {
    const after = document.createRange();
    after.setStartAfter(lastChild);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    return after;
  }
  return range;
}

/**
 * Returns true if every text node inside the given range has an ancestor with
 * the specified tag name (within `root`). Used to decide whether a toggle
 * command should wrap or unwrap the selection.
 */
export function isRangeFullyWrappedBy(range, tagName, root) {
  const upper = tagName.toUpperCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue || node.nodeValue.length === 0) return NodeFilter.FILTER_SKIP;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let saw = false;
  let node;
  while ((node = walker.nextNode())) {
    saw = true;
    let curr = node.parentNode;
    let found = false;
    while (curr && curr !== root && curr !== document.body) {
      if (curr.tagName === upper) { found = true; break; }
      curr = curr.parentNode;
    }
    if (!found) return false;
  }
  return saw;
}

/**
 * Wraps the current selection in a new element with the given tag name. If
 * the selection cannot be wrapped with `Range.surroundContents` (because it
 * spans element boundaries) we fall back to extracting and re-inserting.
 *
 * Returns the wrapper element, or null if no selection exists.
 */
export function wrapSelectionWith(tagName) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return null;

  const wrapper = document.createElement(tagName);
  try {
    range.surroundContents(wrapper);
  } catch (_) {
    // surroundContents throws when the range partially encloses an element.
    // Extract → wrap → reinsert achieves the same effect more permissively.
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  }

  // Reselect the wrapper's contents so successive toggles operate on the
  // same span the user just affected.
  const after = document.createRange();
  after.selectNodeContents(wrapper);
  sel.removeAllRanges();
  sel.addRange(after);
  return wrapper;
}

/**
 * Unwraps every element of the given tag inside the current selection. Useful
 * for the "off" half of a toggle command. The selection is restored over the
 * same text that was previously wrapped.
 */
export function unwrapSelectionFrom(tagName, root) {
  const upper = tagName.toUpperCase();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);

  // Capture the start/end character positions in document text-order so we
  // can rebuild a comparable range after the DOM mutation.
  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preRange.toString().length;
  const length = range.toString().length;

  // Find every wrapper of `tagName` that overlaps the selection.
  const wrappers = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (node.tagName !== upper) return NodeFilter.FILTER_SKIP;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let el;
  while ((el = walker.nextNode())) wrappers.push(el);

  wrappers.forEach(wrapper => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  });

  // Rebuild the selection over the same character offsets.
  _restoreSelectionByCharOffsets(root, startOffset, startOffset + length);
}

/**
 * Returns the {node, offset} pair at the Nth character within `root`.
 * Used internally to restore selections after DOM mutation.
 */
function _resolveCharOffset(root, target) {
  let remaining = target;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length;
    if (remaining <= len) return { node, offset: remaining };
    remaining -= len;
  }
  return null;
}

function _restoreSelectionByCharOffsets(root, start, end) {
  const startPos = _resolveCharOffset(root, start);
  const endPos = _resolveCharOffset(root, end);
  if (!startPos || !endPos) return;
  const sel = window.getSelection();
  const range = document.createRange();
  try {
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (_) { /* selection out of range — ignore */ }
}

/**
 * Toggles an inline formatting wrapper (STRONG/EM/U/S/SUP/SUB) over the
 * current selection. If the selection is already fully wrapped, unwraps ONLY
 * the selected portion (splitting any surrounding wrapper); otherwise wraps
 * the selection. This matches the long-standing behaviour of
 * `document.execCommand('bold' | 'italic' | …)`.
 *
 * The unwrap path uses `Range.extractContents()` to let the browser split
 * surrounding markup around the selection. We then strip only the wrappers
 * that ended up INSIDE the extracted fragment and reinsert it. This preserves
 * formatting on the parts of the wrapper that fell outside the selection.
 *
 * Returns true if the toggle was applied.
 */
export function toggleInlineWrap(tagName, root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;

  const upperTag = tagName.toUpperCase();

  if (isRangeFullyWrappedBy(range, tagName, root)) {
    // ── UNWRAP path ──────────────────────────────────────────────────────
    // Extract the selection. The browser splits the surrounding wrapper
    // automatically, so e.g. <strong>Hello world today</strong> with the
    // word "world" selected becomes:
    //   DOM:      <strong>Hello </strong><strong> today</strong>
    //   fragment: <strong>world</strong>
    const fragment = range.extractContents();

    // Strip every nested wrapper of this tag inside the extracted fragment.
    Array.from(fragment.querySelectorAll(tagName)).forEach(wrapper => {
      const parent = wrapper.parentNode;
      if (!parent) return;
      while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
      parent.removeChild(wrapper);
    });

    // querySelectorAll inside a DocumentFragment ALSO matches top-level
    // children, but only when they have descendants of the tag. To be safe,
    // walk direct children and unwrap any that are themselves the target tag.
    Array.from(fragment.childNodes).forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName === upperTag) {
        const parent = child.parentNode;
        while (child.firstChild) parent.insertBefore(child.firstChild, child);
        parent.removeChild(child);
      }
    });

    // Capture first/last nodes for reselection BEFORE insertNode moves them.
    const firstNode = fragment.firstChild;
    const lastNode = fragment.lastChild;

    range.insertNode(fragment);

    // Reselect the inserted content so the user keeps the same visual span.
    if (firstNode && lastNode) {
      const after = document.createRange();
      try {
        after.setStartBefore(firstNode);
        after.setEndAfter(lastNode);
        sel.removeAllRanges();
        sel.addRange(after);
      } catch (_) { /* fall through */ }
    }
  } else {
    // ── WRAP path ────────────────────────────────────────────────────────
    wrapSelectionWith(tagName);
  }
  return true;
}

/**
 * Sets `text-align` on every block element that intersects the current
 * selection. Replaces `document.execCommand('justifyLeft'|'justifyCenter'|
 * 'justifyRight'|'justifyFull')`.
 *
 * Pass `value = ''` (empty string) to clear the alignment.
 *
 * @param {'left'|'center'|'right'|'justify'|''} value
 * @param {HTMLElement} root
 */
export function alignBlocks(value, root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];

  const BLOCK_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'DIV', 'LI'];
  const range = sel.getRangeAt(0);
  const climbToBlock = (n) => {
    let curr = n && n.nodeType === Node.TEXT_NODE ? n.parentNode : n;
    while (curr && curr !== root) {
      if (curr.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes(curr.tagName)) return curr;
      curr = curr.parentNode;
    }
    return null;
  };

  const startBlock = climbToBlock(range.startContainer);
  const endBlock = climbToBlock(range.endContainer);

  const blocks = new Set();
  if (startBlock) blocks.add(startBlock);
  if (endBlock) blocks.add(endBlock);

  if (startBlock && endBlock && startBlock !== endBlock) {
    // Add every block between them.
    let cursor = startBlock.nextSibling;
    while (cursor && cursor !== endBlock) {
      if (cursor.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes(cursor.tagName)) {
        blocks.add(cursor);
      }
      cursor = cursor.nextSibling;
    }
  }

  blocks.forEach(block => {
    if (value === '' || value == null) {
      block.style.removeProperty('text-align');
      if (block.getAttribute('style') === '') block.removeAttribute('style');
    } else {
      block.style.setProperty('text-align', value);
    }
  });
  return Array.from(blocks);
}

/**
 * Returns true if every block intersecting the current selection has
 * `text-align` matching `value` (considering computed direction for `start`).
 */
export function isAlignmentActive(value, root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const BLOCK_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'DIV', 'LI'];
  let node = sel.anchorNode;
  if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes(node.tagName)) {
      const cs = window.getComputedStyle(node);
      const align = cs.textAlign;
      const dir = cs.direction;
      if (align === value) return true;
      // `start` resolves to left in LTR, right in RTL.
      if (align === 'start' && ((value === 'left' && dir === 'ltr') || (value === 'right' && dir === 'rtl'))) return true;
      return false;
    }
    node = node.parentNode;
  }
  return false;
}

/**
 * Changes the tag name of every block-level element that intersects the
 * current selection. Replaces `document.execCommand('formatBlock', tagName)`.
 *
 * The replacement preserves children and clones attributes, then transfers
 * the selection range over to the new elements. Returns the list of new
 * elements (in document order).
 *
 * @param {string} newTagName - lowercase tag name, e.g. 'h2', 'p', 'blockquote'
 * @param {HTMLElement} root - the editor's editable area
 * @returns {HTMLElement[]} the newly created replacement elements
 */
export function formatBlockNative(newTagName, root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];

  const BLOCK_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'DIV'];
  const range = sel.getRangeAt(0);

  // Capture character offsets BEFORE mutation so selection can be restored.
  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startChar = preRange.toString().length;
  const length = range.toString().length;

  // Find every block that intersects the range.
  const blocks = [];
  const isBlock = (n) => n && n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes(n.tagName);
  const climbToBlock = (n) => {
    let curr = n && n.nodeType === Node.TEXT_NODE ? n.parentNode : n;
    while (curr && curr !== root) {
      if (isBlock(curr)) return curr;
      curr = curr.parentNode;
    }
    return null;
  };

  const startBlock = climbToBlock(range.startContainer);
  const endBlock = climbToBlock(range.endContainer);
  if (startBlock) blocks.push(startBlock);
  if (endBlock && endBlock !== startBlock) {
    // Add every direct-child block of root between startBlock and endBlock.
    let cursor = startBlock ? startBlock.nextSibling : root.firstChild;
    while (cursor && cursor !== endBlock) {
      if (isBlock(cursor)) blocks.push(cursor);
      cursor = cursor.nextSibling;
    }
    blocks.push(endBlock);
  }
  if (blocks.length === 0) return [];

  const target = newTagName.toUpperCase();
  const newBlocks = blocks.map(oldBlock => {
    if (oldBlock.tagName === target) return oldBlock;
    const next = document.createElement(newTagName);
    // Copy attributes EXCEPT the legacy class attribute (caller manages
    // styling); we copy class too so existing styling persists.
    for (const attr of Array.from(oldBlock.attributes)) {
      next.setAttribute(attr.name, attr.value);
    }
    while (oldBlock.firstChild) next.appendChild(oldBlock.firstChild);
    oldBlock.parentNode.replaceChild(next, oldBlock);
    return next;
  });

  // Restore selection over the same character range.
  _restoreSelectionByCharOffsets(root, startChar, startChar + length);
  return newBlocks;
}

/**
 * Removes inline formatting wrappers (STRONG, EM, U, S, SUB, SUP, SPAN with
 * style/class) from the current selection. Replaces
 * `document.execCommand('removeFormat')` for the common cases.
 */
export function removeInlineFormatting(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  // Capture position bookkeeping for restoration.
  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preRange.toString().length;
  const length = range.toString().length;

  const INLINE = ['STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'SUB', 'SUP', 'MARK', 'FONT', 'SPAN'];
  const wrappers = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (!INLINE.includes(node.tagName)) return NodeFilter.FILTER_SKIP;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let el;
  while ((el = walker.nextNode())) wrappers.push(el);

  wrappers.forEach(wrapper => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  });

  _restoreSelectionByCharOffsets(root, startOffset, startOffset + length);
}
