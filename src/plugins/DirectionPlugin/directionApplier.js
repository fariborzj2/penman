/**
 * directionApplier.js
 * Applies a resolved direction value to a block DOM element.
 *
 * Responsibilities:
 *   - Set or remove the `dir` attribute on the block element.
 *   - Never touch inline elements.
 *   - Strip stale `direction` inline styles that could conflict.
 *   - Notify the caller whether the DOM was actually changed (for history).
 */

// Block-level tag names the plugin is allowed to modify.
export const SUPPORTED_BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'DIV',
]);

// Tags that must always remain LTR regardless of content.
export const FORCE_LTR_TAGS = new Set(['PRE', 'CODE']);

/**
 * Returns true if the element is a supported block node.
 * @param {Element} el
 */
export function isSupportedBlock(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  return SUPPORTED_BLOCK_TAGS.has(el.tagName);
}

/**
 * Returns true if the element forces LTR (code blocks etc.).
 * @param {Element} el
 */
export function isForcedLTR(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  if (FORCE_LTR_TAGS.has(el.tagName)) return true;
  // Also check ancestor — if block is inside a <pre>, it's code context.
  let curr = el.parentElement;
  while (curr) {
    if (FORCE_LTR_TAGS.has(curr.tagName)) return true;
    curr = curr.parentElement;
  }
  return false;
}

/**
 * Apply the resolved direction to a block element.
 *
 * @param {Element} block       The block-level DOM element to update.
 * @param {'ltr'|'rtl'} dir     The resolved direction.
 * @returns {boolean}           True if the DOM was modified.
 */
export function applyDirection(block, dir) {
  if (!block || !dir) return false;
  if (!isSupportedBlock(block)) return false;
  if (isForcedLTR(block)) {
    // Ensure code/pre blocks stay LTR.
    if (block.getAttribute('dir') === 'ltr') return false;
    block.setAttribute('dir', 'ltr');
    _stripInlineDirection(block);
    return true;
  }

  const current = block.getAttribute('dir');
  if (current === dir) return false;

  block.setAttribute('dir', dir);
  _stripInlineDirection(block);
  return true;
}

/**
 * Remove any lingering inline `direction` style from the element's direct style
 * attribute. This prevents pasted `style="direction: ltr"` from overriding
 * the `dir` attribute we manage.
 * @param {Element} el
 */
function _stripInlineDirection(el) {
  if (el.style && el.style.direction) {
    el.style.removeProperty('direction');
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  }
}

/**
 * Strip `dir` attributes and inline `direction` styles from all block-level
 * elements inside `root`. Used during paste normalisation before we re-apply.
 *
 * @param {Element} root  Any DOM element (usually a fragment or the editable area).
 */
export function stripIncomingDirection(root) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    if (isSupportedBlock(node)) {
      node.removeAttribute('dir');
      _stripInlineDirection(node);
    }
    node = walker.nextNode();
  }
}
