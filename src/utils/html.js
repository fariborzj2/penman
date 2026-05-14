/**
 * Shared HTML-escape helpers. Every plugin that builds HTML strings should
 * import from here rather than re-implementing — that keeps escape semantics
 * uniform and removes the security risk of inconsistent character sets.
 */

/**
 * Escape characters that have meaning in HTML text content.
 * Replaces & < > " ' with their entity equivalents.
 *
 * @param {*} str  — coerced via String()
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

/**
 * Escape for use inside a double-quoted attribute value. Practically the
 * same as escapeHtml but exists as a named API so callers express intent.
 */
export function escapeHtmlAttr(str) {
  return escapeHtml(str);
}

/**
 * Validate that a URL is safe to use as an `href` or `src`.
 *
 * Rejects URLs whose scheme is `javascript:`, `data:` (except known-safe
 * image data URIs), `vbscript:`, etc. Accepts:
 *   - http://, https://, mailto:, tel:
 *   - relative URLs ("/foo", "foo.html", "#anchor")
 *   - data:image/* (used by some image plugins for inlined uploads)
 *
 * Returns the original URL if safe, or null if rejected.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function safeUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Allow anchors and relative paths outright (no scheme).
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) return trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed; // schemeless

  const lower = trimmed.toLowerCase();
  // Hard blocklist
  if (lower.startsWith('javascript:')) return null;
  if (lower.startsWith('vbscript:'))   return null;
  if (lower.startsWith('about:'))      return null;
  if (lower.startsWith('file:'))       return null;
  // data: only for images
  if (lower.startsWith('data:')) {
    return lower.startsWith('data:image/') ? trimmed : null;
  }

  // Allow common safe schemes
  const okSchemes = ['http:', 'https:', 'mailto:', 'tel:', 'sms:', 'ftp:'];
  for (const s of okSchemes) {
    if (lower.startsWith(s)) return trimmed;
  }
  // Unknown scheme → reject to be conservative
  return null;
}

/**
 * Strip dangerous attributes from a DOM tree:
 *   - all `on*` event-handler attributes
 *   - `href` / `src` / `action` / `formaction` with javascript:/vbscript:/etc.
 *
 * Mutates the tree in place. Used by insertHTMLAtSelection before content
 * reaches the editor.
 *
 * @param {Element|DocumentFragment} root
 */
export function stripUnsafeAttributes(root) {
  if (!root || !root.querySelectorAll) return;
  const all = root.querySelectorAll('*');
  const urlAttrs = ['href', 'src', 'action', 'formaction', 'xlink:href'];
  for (const el of all) {
    // Remove every on* attribute (case-insensitive).
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
    // Validate URL-bearing attributes.
    for (const a of urlAttrs) {
      if (el.hasAttribute(a)) {
        const safe = safeUrl(el.getAttribute(a));
        if (safe === null) el.removeAttribute(a);
        else if (safe !== el.getAttribute(a)) el.setAttribute(a, safe);
      }
    }
  }
}
