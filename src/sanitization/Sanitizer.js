export class Sanitizer {
  constructor() {
    // Whitelist approach: only allow specific tags and attributes
    this.allowedTags = {
      'p': [],
      'b': [],
      'i': [],
      'u': [],
      'strong': [],
      'em': [],
      'a': ['href', 'target', 'rel'],
      'ul': [],
      'ol': [],
      'li': [],
      'br': [],
      'span': ['style', 'id'] // Added id and style for marker retention
    };
  }

  /**
   * Sanitizes the given HTML string
   * @param {string} dirtyHtml
   * @returns {string} Cleaned HTML string
   */
  sanitize(dirtyHtml) {
    if (!dirtyHtml) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');

    this._sanitizeNode(doc.body);

    return doc.body.innerHTML;
  }

  _sanitizeNode(node) {
    // Convert children to array so we can safely remove or modify nodes while iterating
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        continue;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();

        if (!this.allowedTags[tagName]) {
          // Tag is not allowed. Unwrapping.
          // Before unwrapping, we should sanitize its children recursively.
          this._sanitizeNode(child);

          // Now unwrap. We must insert children before the child, then remove the child.
          const parent = child.parentNode;
          while (child.firstChild) {
            parent.insertBefore(child.firstChild, child);
          }
          parent.removeChild(child);
        } else {
          // Tag is allowed. Clean attributes.
          this._cleanAttributes(child, tagName);
          // Recursively clean children
          this._sanitizeNode(child);
        }
      } else {
        // Remove comments and other node types
        child.parentNode.removeChild(child);
      }
    }
  }

  _cleanAttributes(element, tagName) {
    const allowedAttrs = this.allowedTags[tagName];
    const attrs = Array.from(element.attributes);

    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();
      if (!allowedAttrs.includes(attrName)) {
        element.removeAttribute(attrName);
      } else {
        // Additional security: block `javascript:` URIs in href
        if (attrName === 'href') {
          // Remove invisible/control characters that could bypass the check
          const value = attr.value.replace(/[\x00-\x20\x7F]/g, '').toLowerCase();
          if (value.startsWith('javascript:')) {
            element.removeAttribute('href');
          }
        }
      }
    }
  }
}
