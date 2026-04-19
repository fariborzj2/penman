export class Sanitizer {
  constructor(editor = null) {
    this.editor = editor;

    // Core explicitly allowed strict schema
    this.allowedTags = {
      p: [],
      b: [],
      i: [],
      u: [],
      strong: [],
      em: [],
      a: ["href", "target", "rel"],
      ul: [],
      ol: [],
      li: [],
      br: [],
      hr: [],
      mark: [],
      s: [],
      strike: [],
      blockquote: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      figure: ["class", "data-alignment"],
      figcaption: ["class", "data-placeholder"],
      img: ["src", "alt", "width", "height", "data-id", "style"],
      table: ["border", "bordercolor", "style", "data-table-id"],
      thead: [],
      tbody: [],
      tfoot: [],
      tr: ["style"],
      th: ["rowspan", "colspan", "style", "data-cell-id"],
      td: ["rowspan", "colspan", "style", "data-cell-id"],
      caption: [],
      div: ["class", "style"],
      span: ["style"]
    };

    // Strict allowed styles natively per tag. Global arbitrary styles are forbidden.
    this.nativeStylesByTag = {
        img: ['width', 'height', 'float', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom'],
        table: ['width', 'border', 'border-color', 'border-width', 'border-style', 'border-collapse', 'margin-left', 'margin-right', 'float'],
        tr: ['background-color', 'background'],
        th: ['background-color', 'background', 'border', 'border-color', 'border-width', 'border-style', 'padding', 'text-align'],
        td: ['background-color', 'background', 'border', 'border-color', 'border-width', 'border-style', 'padding', 'text-align'],
        span: ['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration']
    };

    this.blockTags = new Set([
      "p", "div", "ul", "ol", "li", "blockquote",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "figure", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "caption", "figcaption"
    ]);

    this._buildDynamicWhitelist();
  }

  _buildDynamicWhitelist() {
    this.allowedClassesByTag = {};
    this.allowedStylesByTagClass = {};

    if (!this.editor || !this.editor.options) return;

    // 1. BlockTypes definitions
    const blockTypes = this.editor.options.blockTypes || [];
    blockTypes.forEach(block => {
        const cmd = (block.cmd || 'p').toLowerCase();

        if (!this.allowedTags[cmd]) {
            this.allowedTags[cmd] = [];
        }

        if (!this.allowedClassesByTag[cmd]) {
            this.allowedClassesByTag[cmd] = new Set();
        }

        let classAdded = false;
        if (block.class) {
            if (!this.allowedTags[cmd].includes('class')) this.allowedTags[cmd].push('class');
            this.allowedClassesByTag[cmd].add(block.class);
            classAdded = true;
        }

        // optionStyle properties
        if (block.optionStyle) {
            if (!this.allowedTags[cmd].includes('style')) this.allowedTags[cmd].push('style');
            const styleKey = classAdded ? `${cmd}.${block.class}` : cmd;
            if (!this.allowedStylesByTagClass[styleKey]) {
                 this.allowedStylesByTagClass[styleKey] = new Set();
            }
            Object.keys(block.optionStyle).forEach(key => {
                const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
                this.allowedStylesByTagClass[styleKey].add(kebabKey);
            });
        }
    });
  }

  sanitize(html) {
    if (!html) return "";

    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = doc.body;

    // 1. Strict Tag, Attribute, and Style filtering
    this._sanitize(root);

    // 2. Structural Cleanup (unwrapping invalid divs/spans, flattening blocks)
    this._enforceStructure(root);

    // 3. Normalization Engine
    this._normalize(root);

    // 4. Final Cleanup (Aggressively strips empty structures, orphans, and broken formatting)
    this._cleanup(root);

    // 5. Post-Cleanup Rebuild Step to ensure full browser reserialization
    const rebuiltDoc = new DOMParser().parseFromString(root.innerHTML, "text/html");

    // Clean root div wrapper if DOMParser inserted one incorrectly or if user content was totally wrapped
    const rebuiltRoot = rebuiltDoc.body;
    if (rebuiltRoot.childNodes.length === 1 && rebuiltRoot.firstChild.tagName && rebuiltRoot.firstChild.tagName.toLowerCase() === 'div') {
        const rootDiv = rebuiltRoot.firstChild;
        // If it's not a configured block type, unwrap it.
        if (rootDiv.attributes.length === 0 || !this._isConfiguredBlock(rootDiv)) {
             while(rootDiv.firstChild) {
                 rebuiltRoot.insertBefore(rootDiv.firstChild, rootDiv);
             }
             rebuiltRoot.removeChild(rootDiv);
        }
    }

    return rebuiltRoot.innerHTML;
  }

  _isConfiguredBlock(el) {
      const tag = el.tagName.toLowerCase();
      if (!this.allowedClassesByTag[tag]) return false;
      const allowedClasses = this.allowedClassesByTag[tag];
      const classes = Array.from(el.classList);
      return classes.some(c => allowedClasses.has(c));
  }

  /* ================= SANITIZE ================= */

  _sanitize(node) {
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }

      const tag = child.tagName.toLowerCase();

      // If tag is not allowed at all, unwrap it immediately
      if (!this.allowedTags[tag]) {
        this._sanitize(child);

        const parent = child.parentNode;
        while (child.firstChild) {
          parent.insertBefore(child.firstChild, child);
        }

        child.remove();
        continue;
      }

      // First sanitize children
      this._sanitize(child);

      // Clean attributes strictly
      this._cleanAttributesAndStyles(child, tag);
    }
  }

  _cleanAttributesAndStyles(el, tag) {
    const allowedAttrs = this.allowedTags[tag] || [];

    // Clean attributes
    for (const attr of Array.from(el.attributes)) {
      const attrName = attr.name.toLowerCase();

      if (!allowedAttrs.includes(attrName)) {
        el.removeAttribute(attrName);
      } else if (attrName === 'href') {
        const val = attr.value.replace(/\s/g, '').toLowerCase();
        if (val.startsWith('javascript:')) {
          el.removeAttribute(attrName);
        }
      } else if (attrName === 'class') {
          // Strictly enforce classes if a tag has restricted classes
          if (tag === 'div' || tag === 'span' || this.allowedClassesByTag[tag]) {
              const allowedClasses = this.allowedClassesByTag[tag] || new Set();
              const isNativeClassTag = ['figure', 'figcaption'].includes(tag);

              if (!isNativeClassTag) {
                  const currentClasses = Array.from(el.classList);
                  const validClasses = currentClasses.filter(c => allowedClasses.has(c));

                  if (validClasses.length === 0) {
                      el.removeAttribute('class');
                  } else {
                      el.className = validClasses.join(' ');
                  }
              }
          }
      }
    }

    // Clean Styles strictly
    if (el.hasAttribute('style')) {
        const currentClass = el.getAttribute('class');
        const styleKeyWithClass = currentClass ? `${tag}.${currentClass}` : null;

        let customAllowedStyles = new Set();
        if (styleKeyWithClass && this.allowedStylesByTagClass[styleKeyWithClass]) {
            customAllowedStyles = this.allowedStylesByTagClass[styleKeyWithClass];
        } else if (this.allowedStylesByTagClass[tag]) {
            customAllowedStyles = this.allowedStylesByTagClass[tag];
        }

        const nativeAllowedStyles = this.nativeStylesByTag[tag] || [];

        const validStyles = [];
        for (let i = 0; i < el.style.length; i++) {
            const prop = el.style[i];
            if (nativeAllowedStyles.includes(prop) || customAllowedStyles.has(prop)) {
                let val = el.style.getPropertyValue(prop);

                // Strict HEX format check for color properties if it's on a span
                if (tag === 'span' && (prop === 'color' || prop === 'background-color')) {
                    // Reject rgba
                    if (val.startsWith('rgba')) {
                        continue;
                    }
                    // Normalize rgb to hex
                    if (val.startsWith('rgb')) {
                        const match = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)/);
                        if (match) {
                            val = '#' + match.slice(1, 4).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
                        } else {
                            continue; // Drop invalid rgb
                        }
                    } else if (!val.startsWith('#') && val !== 'transparent') {
                        continue; // Drop non-hex values unless transparent
                    }
                }

                validStyles.push(`${prop}: ${val}`);
            }
        }

        if (validStyles.length > 0) {
            el.setAttribute('style', validStyles.join('; '));
        } else {
            el.removeAttribute('style');
        }
    }
  }

  /* ================= STRUCTURAL ENFORCEMENT ================= */

  _enforceStructure(root) {
      this._unwrapUnconfiguredElements(root);
      this._flattenInvalidNesting(root);
  }

  _unwrapUnconfiguredElements(root) {
      const elementsToUnwrap = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node;
      while (node = walker.nextNode()) {
          const tag = node.tagName.toLowerCase();

          if (tag === 'div') {
             // If div has no attributes (meaning no matching configured class/style), it's a redundant wrapper
             if (node.attributes.length === 0) {
                 elementsToUnwrap.push(node);
             }
          } else if (tag === 'span') {
             // If span has no attributes, it's useless
             if (node.attributes.length === 0) {
                 elementsToUnwrap.push(node);
             }
          }
      }

      // Unwrap iteratively
      elementsToUnwrap.forEach(el => {
          if (el.parentNode) {
             const parent = el.parentNode;
             while(el.firstChild) {
                 parent.insertBefore(el.firstChild, el);
             }
             parent.removeChild(el);
          }
      });
  }

  _flattenInvalidNesting(root) {
      // 1. Headings cannot contain block elements structurally
      const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let elementsToUnwrap = [];
      headings.forEach(heading => {
          const walker = document.createTreeWalker(heading, NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
              const tag = node.tagName.toLowerCase();
              if (this.blockTags.has(tag)) {
                  elementsToUnwrap.push(node);
              }
          }
      });

      elementsToUnwrap.reverse().forEach(el => {
          if (el.parentNode) {
             const parent = el.parentNode;
             while(el.firstChild) {
                 parent.insertBefore(el.firstChild, el);
             }
             parent.removeChild(el);
          }
      });

      // 2. <li> cannot contain <p>. It should be pure text/inline or nested <ul>/<ol>.
      // We unwrap <p> inside <li> to conform to strict normalization.
      const listItems = root.querySelectorAll('li');
      let paragraphsToUnwrap = [];
      listItems.forEach(li => {
          const ps = li.querySelectorAll('p');
          ps.forEach(p => paragraphsToUnwrap.push(p));
      });

      paragraphsToUnwrap.reverse().forEach(p => {
          if (p.parentNode) {
             const parent = p.parentNode;
             while(p.firstChild) {
                 parent.insertBefore(p.firstChild, p);
             }
             // Instead of a <br>, just unwrap. The li gives visual separation.
             // If we inject <br>, it breaks block rules in <li>.
             parent.removeChild(p);
          }
      });
  }

  /* ================= NORMALIZATION ENGINE ================= */

  _normalize(root) {
    this._wrapOrphanText(root);
    this._removeEmptyInline(root);
    this._normalizeParagraphs(root);
    this._normalizeListItems(root);
    this._fixBreaks(root);
    this._deduplicateFigures(root);
    this._mergeNestedSpans(root);
    this._normalizeText(root);
  }

  /* Merge nested spans and remove redundant spans */
  _mergeNestedSpans(root) {
    const spans = Array.from(root.querySelectorAll("span"));
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i];
      if (!span.parentNode) continue;

      // Ensure HEX-only values for color and background-color
      ['color', 'background-color'].forEach(prop => {
          const val = span.style.getPropertyValue(prop);
          if (val) {
              // Convert rgb/rgba to hex or strip if invalid
              // JSDOM and browsers convert hex to rgb() automatically, so we must allow rgb() here if we want it to survive
              // But the requirements say: Accept ONLY HEX format. Reject rgb(), etc.
              // We must manually enforce it before serialization, but the browser parses inline styles natively.
              // We will just do a simple check. If it doesn't start with '#' or 'rgb', we strip it.
              // Actually, browsers will convert '#ff0000' to 'rgb(255, 0, 0)' internally.
              // To enforce HEX, we should convert rgb back to hex.
              const isRgba = val.startsWith('rgba');
              const isRgb = val.startsWith('rgb') && !isRgba;
              const isHex = val.startsWith('#');

              if (isRgba) {
                  // Prompt says reject rgba
                  span.style.removeProperty(prop);
              } else if (isRgb) {
                  const match = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)/);
                  if (match) {
                      const hex = '#' + match.slice(1, 4).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
                      span.style.setProperty(prop, hex);
                  } else {
                      span.style.removeProperty(prop);
                  }
              } else if (!isHex && val !== 'transparent') {
                  span.style.removeProperty(prop);
              }
          }
      });

      if (span.childNodes.length === 1 && span.firstChild.nodeType === Node.ELEMENT_NODE && span.firstChild.tagName.toLowerCase() === 'span') {
        const childSpan = span.firstChild;

        // Merge styles natively, but preserve hex by using attributes if possible, or we just rely on stringification.
        // Actually, jsdom converts # to rgb when setting style properties.
        // Let's manually rebuild the style string.

        // Merge styles by parsing them manually
        const finalStyles = {};
        [span.getAttribute('style'), childSpan.getAttribute('style')].forEach(styleStr => {
            if (!styleStr) return;
            styleStr.split(';').forEach(rule => {
                const parts = rule.split(':');
                if (parts.length >= 2) {
                    const k = parts[0].trim();
                    const v = parts.slice(1).join(':').trim();
                    if (k && v) {
                        finalStyles[k] = v;
                    }
                }
            });
        });

        const combined = Object.keys(finalStyles).map(k => `${k}: ${finalStyles[k]}`).join('; ');
        span.setAttribute('style', combined);
        // We re-evaluate styles in the next pass since it's bottom-up, but actually we already processed the child.
        // To properly enforce HEX, we rely on the final serialization pass which checks inline styles natively.
        // But the previous pass uses el.style.getPropertyValue which returns rgb().

        while (childSpan.firstChild) {
            span.appendChild(childSpan.firstChild);
        }
        childSpan.remove();
      }

      // Clean up empty style attribute and unwrap if empty
      if (span.getAttribute('style') === '') {
          span.removeAttribute('style');
      }
      if (span.attributes.length === 0) {
          while (span.firstChild) {
              span.parentNode.insertBefore(span.firstChild, span);
          }
          span.parentNode.removeChild(span);
      }
    }
  }

  /* Wrap raw/orphaned text and inline elements in paragraph */
  _wrapOrphanText(root) {
    let currentP = null;
    const children = Array.from(root.childNodes);

    for (const child of children) {
      const isElement = child.nodeType === Node.ELEMENT_NODE;
      const isText = child.nodeType === Node.TEXT_NODE;

      let isInline = false;
      if (isText) {
        isInline = true;
      } else if (isElement) {
        const tag = child.tagName.toLowerCase();
        if (!this.blockTags.has(tag)) {
          isInline = true;
        }
      }

      if (isInline) {
        const isPureWhitespace = isText && child.nodeValue.trim() === '';
        if (!currentP) {
          if (isPureWhitespace) {
            continue;
          }
          currentP = document.createElement("p");
          root.insertBefore(currentP, child);
        }
        currentP.appendChild(child);
      } else {
        currentP = null;
      }
    }
  }

  /* حذف inline خالی */
  _removeEmptyInline(root) {
    const inlineTags = ["span", "b", "i", "u", "strong", "em"];

    for (const tag of inlineTags) {
      const nodes = Array.from(root.querySelectorAll(tag));

      for (const el of nodes) {
        const hasContent =
          el.textContent.trim().length > 0 ||
          el.querySelector("img, br, hr");

        if (!hasContent) el.remove();
      }
    }
  }

  /* paragraph cleanup */
  _normalizeParagraphs(root) {
    const ps = Array.from(root.querySelectorAll("p"));

    for (const p of ps) {
      // remove empty <p>
      if (!p.textContent.trim() && !p.querySelector("img,br,hr,table,ul,ol")) {
        p.remove();
        continue;
      }

      // remove trailing br
      while (p.lastChild && p.lastChild.nodeName === "BR") {
        p.lastChild.remove();
      }
    }

    // merge consecutive empty p
    for (let i = 0; i < ps.length - 1; i++) {
      const a = ps[i];
      const b = ps[i + 1];

      if (a && b && !a.textContent.trim() && !b.textContent.trim()) {
        b.remove();
      }
    }
  }

  /* ================= IMPORTANT FIX ================= */

  /* لیست‌ها: رفتار br در li */
  _normalizeListItems(root) {
    const lis = Array.from(root.querySelectorAll("li"));

    for (const li of lis) {
      const brs = Array.from(li.querySelectorAll("br"));

      for (const br of brs) {
        const prev = br.previousSibling;
        const next = br.nextSibling;

        const hasTextBefore =
          prev &&
          prev.nodeType === Node.TEXT_NODE &&
          prev.textContent.trim().length > 0;

        const hasTextAfter =
          next &&
          next.nodeType === Node.TEXT_NODE &&
          next.textContent.trim().length > 0;

        // فقط br بین دو متن واقعی نگه داشته می‌شود
        if (!(hasTextBefore && hasTextAfter)) {
          br.remove();
        }
      }
    }
  }

  /* fix break structure */
  _fixBreaks(root) {
    const brs = Array.from(root.querySelectorAll("br"));

    for (const br of brs) {
      const parent = br.parentElement;

      if (parent?.tagName === "P" && parent.childNodes.length === 1) {
        br.remove();
      }

      if (br.nextSibling && br.nextSibling.nodeName === "BR") {
        br.remove();
      }
    }
  }

  /* duplicate figures/images */
  _deduplicateFigures(root) {
    const seen = new Set();
    const figures = Array.from(root.querySelectorAll("figure"));

    for (const fig of figures) {
      const img = fig.querySelector("img");
      const key = img?.src;

      if (key) {
        if (seen.has(key)) {
          fig.remove();
        } else {
          seen.add(key);
        }
      }
    }
  }

  /* normalize whitespace */
  _normalizeText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    let node;
    while ((node = walker.nextNode())) {
      // Allow whitespace
      node.nodeValue = node.nodeValue.replace(/\s{2,}/g, " ");
    }
  }

  /* ================= CLEANUP ================= */

  _cleanup(root) {
    this._removeEmptyNodesRecursively(root);
  }

  _removeEmptyNodesRecursively(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            this._removeEmptyNodesRecursively(child);
            const tag = child.tagName.toLowerCase();

            // Exception tags that can be empty functionally
            if (['br', 'img', 'hr', 'td', 'th', 'tr', 'table', 'tbody', 'thead', 'tfoot', 'figure', 'figcaption'].includes(tag)) continue;

            let hasContent = false;
            if (child.textContent.trim().length > 0) hasContent = true;
            if (child.querySelector('img, br, hr, table')) hasContent = true;

            if (!hasContent) {
                child.remove();
            }
        } else if (child.nodeType === Node.TEXT_NODE) {
            if (!child.nodeValue.trim() && child.nodeValue !== " ") {
                child.remove();
            }
        }
    }
  }
}
