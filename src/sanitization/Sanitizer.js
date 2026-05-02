export class Sanitizer {
  constructor(editor = null) {
    this.editor = editor;

    // Core explicitly allowed strict schema
    this.allowedTags = {
      p: ["dir"],
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
      pre: ["dir", "style", "class"],
      code: ["dir", "style", "class", "data-language"],
      h1: ["dir"],
      h2: ["dir"],
      h3: ["dir"],
      h4: ["dir"],
      h5: ["dir"],
      h6: ["dir"],
      figure: ["data-alignment", "contenteditable", "data-penman-core", "data-media-id", "data-provider", "data-kind", "data-src", "data-poster", "data-title", "data-controls", "data-autoplay"],
      figcaption: ["data-placeholder", "contenteditable"],
      img: ["src", "alt", "width", "height", "data-id"],
      iframe: ["src", "title", "frameborder", "allow", "loading", "width", "height", "style"],
      video: ["src", "poster", "title", "controls", "autoplay", "muted", "width", "height", "style"],
      audio: ["src", "title", "controls", "autoplay", "muted", "width", "height", "style"],
      table: ["data-table-id", "contenteditable", "data-penman-core"],
      thead: [],
      tbody: [],
      tfoot: [],
      tr: [],
      th: ["rowspan", "colspan", "data-cell-id", "contenteditable"],
      td: ["rowspan", "colspan", "data-cell-id", "contenteditable"],
      caption: [],
      div: ["contenteditable", "data-penman-core"],
      span: ["style", "class"]
    };

    // Strict allowed styles natively per tag. Global arbitrary styles are forbidden.
    this.nativeStylesByTag = {
        img: ['width', 'height', 'float', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom'],
        table: ['width', 'border', 'border-color', 'border-width', 'border-style', 'border-collapse', 'margin-left', 'margin-right', 'float'],
        tr: ['background-color', 'background'],
        th: ['background-color', 'background', 'border', 'border-color', 'border-width', 'border-style', 'padding', 'text-align'],
        td: ['background-color', 'background', 'border', 'border-color', 'border-width', 'border-style', 'padding', 'text-align'],
        span: ['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration'],
        pre: ['text-align', 'white-space', 'font-family', 'background-color', 'padding', 'border-radius', 'overflow-x', 'direction'],
        code: ['font-family', 'direction'],
        iframe: ['position', 'top', 'left', 'width', 'height'],
        video: ['position', 'top', 'left', 'width', 'height'],
        audio: ['position', 'top', 'left', 'width', 'height'],
        div: ['position', 'padding-bottom', 'height', 'width', 'overflow', 'top', 'left', 'z-index', 'cursor']
    };

    this.blockTags = new Set([
      "p", "div", "ul", "ol", "li", "blockquote", "pre", "code",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "figure", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "caption", "figcaption"
    ]);

    this._buildDynamicWhitelist();
  }

  _buildDynamicWhitelist() {
    this.allowedClassesByTag = {
        div: new Set(['penman-suggested-posts-wrapper', 'penman-suggested-posts-wrapper-title', 'penman-image-wrapper', 'penman-media-wrapper', 'penman-media-overlay', 'penman-selected-node']),
        ul: new Set(['penman-suggested-posts-wrapper-list']),
        li: new Set(['penman-suggested-posts-wrapper-item']),
        a: new Set(['penman-suggested-posts-wrapper-link']),
        figure: new Set(['penman-image', 'penman-align-center', 'penman-align-left', 'penman-align-right', 'penman-media', 'penman-media-block', 'penman-selected-node']),
        figcaption: new Set(['penman-image-caption']),
        table: new Set(['penman-selected-node']),
        td: new Set(['penman-cell-selected']),
        th: new Set(['penman-cell-selected'])
    };
    this.allowedStylesByTagClass = {};

    // Automatically add 'class' to allowedTags for any tag that has configured classes
    Object.keys(this.allowedClassesByTag).forEach(tag => {
        if (this.allowedTags[tag] && !this.allowedTags[tag].includes('class')) {
            this.allowedTags[tag].push('class');
        }
    });

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

  _sanitize(node, isProtected = false) {
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }

      const tag = child.tagName.toLowerCase();

      // Check if this node marks the start of a protected zone
      // Code blocks (pre/code) content should be treated as protected to preserve highlighting spans
      // IMPORTANT: pre and code themselves are NOT protected, only their content.
      const nodeIsProtected = isProtected ||
          (child.getAttribute && child.getAttribute('data-penman-core') === 'true');

      const isCodeContent = tag === 'pre' || tag === 'code';

      // If tag is not allowed at all, unwrap it immediately
      if (!this.allowedTags[tag]) {
        this._sanitize(child, nodeIsProtected);

        const parent = child.parentNode;
        while (child.firstChild) {
          parent.insertBefore(child.firstChild, child);
        }

        child.remove();
        continue;
      }

      // First sanitize children
      this._sanitize(child, nodeIsProtected || isCodeContent);

      // Clean attributes strictly
      this._cleanAttributesAndStyles(child, tag, nodeIsProtected || (isCodeContent && (tag === 'pre' || tag === 'code')));
    }
  }

  _cleanAttributesAndStyles(el, tag, isProtected = false) {
    // If node is protected, we allow ALL its current attributes.
    // This ensures full identical structure for internal copy-paste.
    if (isProtected) {
        return;
    }

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
                  const validClasses = currentClasses.filter(c => {
                      if (allowedClasses.has(c)) return true;
                      // Allow highlight.js classes on spans
                      if (tag === 'span' && c.startsWith('hljs-')) return true;
                      return false;
                  });

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

  _isProtected(el) {
      let curr = el;
      while (curr && curr !== document.body) {
          if (curr.getAttribute && curr.getAttribute('data-penman-core') === 'true') {
              return true;
          }
          curr = curr.parentNode;
      }
      return false;
  }

  _unwrapUnconfiguredElements(root) {
      const elementsToUnwrap = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node;
      while (node = walker.nextNode()) {
          const tag = node.tagName.toLowerCase();

          if (this._isProtected(node)) {
              continue;
          }

          if (tag === 'div') {
             // If it's a protected widget wrapper, don't unwrap it
             if (this._isConfiguredBlock(node)) {
                 continue;
             }

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
          if (this._isProtected(heading)) return;
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
          if (this._isProtected(li)) return;
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
    this._normalizeTableStructure(root);
    this._normalizeText(root);
  }

  _normalizeTableStructure(root) {
    const tables = Array.from(root.querySelectorAll('table'));
    tables.forEach(table => {
      // Ensure data-table-id exists
      if (!table.getAttribute('data-table-id')) {
        table.setAttribute('data-table-id', 't-' + Math.random().toString(36).substr(2, 9));
      }

      // Ensure thead exists using non-recursive checks to avoid nested table issues
      let thead = Array.from(table.children).find(el => el.tagName.toLowerCase() === 'thead');
      let tbody = Array.from(table.children).find(el => el.tagName.toLowerCase() === 'tbody');

      if (!tbody) {
        tbody = document.createElement('tbody');
        const rows = Array.from(table.children).filter(el => el.tagName.toLowerCase() === 'tr');
        rows.forEach(row => tbody.appendChild(row));
        table.appendChild(tbody);
      }

      if (!thead) {
        // Try to promote the first row of tbody to thead if it's not already there
        const firstRow = Array.from(tbody.children).find(el => el.tagName.toLowerCase() === 'tr');
        if (firstRow) {
          thead = document.createElement('thead');
          table.insertBefore(thead, tbody);
          thead.appendChild(firstRow);

          // Convert td to th in thead (only immediate children)
          const cells = Array.from(firstRow.children).filter(el => el.tagName.toLowerCase() === 'td');
          cells.forEach(td => {
            const th = document.createElement('th');
            // Copy attributes
            Array.from(td.attributes).forEach(attr => th.setAttribute(attr.name, attr.value));
            while (td.firstChild) th.appendChild(td.firstChild);
            td.parentNode.replaceChild(th, td);
          });
        }
      } else {
        // If thead exists, ensure its cells are th
        const rows = Array.from(thead.children).filter(el => el.tagName.toLowerCase() === 'tr');
        rows.forEach(row => {
          const cells = Array.from(row.children).filter(el => el.tagName.toLowerCase() === 'td');
          cells.forEach(td => {
            const th = document.createElement('th');
            Array.from(td.attributes).forEach(attr => th.setAttribute(attr.name, attr.value));
            while (td.firstChild) th.appendChild(td.firstChild);
            td.parentNode.replaceChild(th, td);
          });
        });
      }
    });

    // Ensure all cells have IDs and proper paragraph-based content structure
    const cells = Array.from(root.querySelectorAll('th, td'));
    cells.forEach(cell => {
      if (!cell.getAttribute('data-cell-id')) {
        cell.setAttribute('data-cell-id', 'c-' + Math.random().toString(36).substr(2, 9));
      }

      // Enforce <p> structure within cells
      const children = Array.from(cell.childNodes);
      const hasBlock = children.some(node => node.nodeType === Node.ELEMENT_NODE && this.blockTags.has(node.tagName.toLowerCase()));

      if (!hasBlock) {
        // If no block elements, wrap everything in a <p>
        const p = document.createElement('p');
        while (cell.firstChild) {
          p.appendChild(cell.firstChild);
        }
        if (p.innerHTML.trim() === '') p.innerHTML = '<br>';
        cell.appendChild(p);
      } else {
        // If there are block elements, ensure all orphan text/inline elements are wrapped in <p>
        let currentP = null;
        Array.from(cell.childNodes).forEach(child => {
          const isInline = child.nodeType === Node.TEXT_NODE ||
                         (child.nodeType === Node.ELEMENT_NODE && !this.blockTags.has(child.tagName.toLowerCase()));

          if (isInline) {
            if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === '' && !currentP) return;
            if (!currentP) {
              currentP = document.createElement('p');
              cell.insertBefore(currentP, child);
            }
            currentP.appendChild(child);
          } else {
            currentP = null;
          }
        });
      }

      // Final pass: ensure no empty text nodes or loose <br> remain as direct children of the cell
      Array.from(cell.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === '') {
          child.remove();
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'br') {
          child.remove();
        }
      });
    });
  }

  /* Merge nested spans and remove redundant spans via style state pushdown */
  _mergeNestedSpans(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            // Skip text nodes inside code blocks to preserve highlight.js spans and formatting
            let curr = node.parentNode;
            while(curr && curr !== root) {
                const tag = curr.tagName ? curr.tagName.toLowerCase() : '';
                if (tag === 'pre' || tag === 'code') return NodeFilter.FILTER_REJECT;
                curr = curr.parentNode;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    let node;
    while(node = walker.nextNode()) {
        if (node.nodeValue.trim().length > 0 || node.nodeValue === ' ') {
            nodes.push(node);
        }
    }

    const wrappers = [];

    nodes.forEach(textNode => {
        const styles = {};
        const classes = new Set();
        let curr = textNode.parentNode;
        while(curr && curr !== root) {
            if (curr.tagName && curr.tagName.toLowerCase() === 'span') {
                // Extract styles, enforcing HEX logic
                for (let i = 0; i < curr.style.length; i++) {
                    const prop = curr.style[i];
                    let val = curr.style.getPropertyValue(prop);

                    if (prop === 'color' || prop === 'background-color') {
                        if (val.startsWith('rgba')) {
                            continue; // drop rgba
                        } else if (val.startsWith('rgb')) {
                            const match = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)/);
                            if (match) {
                                val = '#' + match.slice(1, 4).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
                            } else {
                                continue;
                            }
                        } else if (!val.startsWith('#') && val !== 'transparent') {
                            continue;
                        }
                    }

                    if (!styles[prop]) {
                        styles[prop] = val; // child overrides parent (since we go bottom-up)
                    }
                }

                // Extract classes
                Array.from(curr.classList).forEach(c => classes.add(c));
            }
            curr = curr.parentNode;
        }

        if (Object.keys(styles).length > 0 || classes.size > 0) {
            wrappers.push({textNode, styles, classes});
        }
    });

    // Unwrap spans (excluding those in code blocks or with hljs classes)
    const spans = Array.from(root.querySelectorAll('span'));
    spans.reverse().forEach(span => {
        // Skip hljs spans
        if (span.className && span.className.includes('hljs-')) return;

        // Skip spans inside code blocks
        let curr = span.parentNode;
        let insideCode = false;
        while(curr && curr !== root) {
            if (curr.tagName && (curr.tagName.toLowerCase() === 'pre' || curr.tagName.toLowerCase() === 'code')) {
                insideCode = true;
                break;
            }
            curr = curr.parentNode;
        }
        if (insideCode) return;

        while(span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
        span.remove();
    });

    // Re-wrap text nodes with accumulated unified styles
    wrappers.forEach(({textNode, styles, classes}) => {
        let currentNode = textNode;

        if (styles['font-weight'] === 'bold') {
            const strong = document.createElement('strong');
            textNode.parentNode.insertBefore(strong, textNode);
            strong.appendChild(textNode);
            currentNode = strong;
            delete styles['font-weight'];
        }

        if (styles['font-style'] === 'italic') {
            const em = document.createElement('em');
            currentNode.parentNode.insertBefore(em, currentNode);
            em.appendChild(currentNode);
            currentNode = em;
            delete styles['font-style'];
        }

        if (Object.keys(styles).length > 0 || classes.size > 0) {
            const span = document.createElement('span');
            const styleString = Object.keys(styles).map(k => `${k}: ${styles[k]}`).join('; ');
            if (styleString) {
                span.setAttribute('style', styleString);
            }

            if (classes.size > 0) {
                span.className = Array.from(classes).join(' ');
            }
            currentNode.parentNode.insertBefore(span, currentNode);
            span.appendChild(currentNode);
        }
    });

    // Merge adjacent identical spans
    let changed = true;
    while(changed) {
        changed = false;
        const currentSpans = Array.from(root.querySelectorAll('span'));
        for (let i = 0; i < currentSpans.length - 1; i++) {
            const current = currentSpans[i];
            const next = current.nextSibling;

            if (next && next.nodeType === Node.ELEMENT_NODE && next.tagName.toLowerCase() === 'span') {
                const currentStyles = current.getAttribute('style') || '';
                const nextStyles = next.getAttribute('style') || '';
                const currentClasses = current.getAttribute('class') || '';
                const nextClasses = next.getAttribute('class') || '';

                if (currentStyles === nextStyles && currentClasses === nextClasses) {
                    while(next.firstChild) current.appendChild(next.firstChild);
                    next.remove();
                    changed = true;
                    break;
                }
            }
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
        // Do not remove spans that are purely formatting a newline character
        if (el.textContent === '\n' && el.classList.length > 0 && el.classList[0].startsWith('penman-token-')) {
            continue;
        }
        
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
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            // NEVER normalize text inside code blocks
            let curr = node.parentNode;
            while (curr && curr !== root) {
                const tag = curr.tagName ? curr.tagName.toLowerCase() : '';
                if (tag === 'pre' || tag === 'code') return NodeFilter.FILTER_REJECT;
                curr = curr.parentNode;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    let node;
    while ((node = walker.nextNode())) {
      let text = node.nodeValue;

      // 1. Basic whitespace normalization: collapse multiple spaces
      text = text.replace(/\s{2,}/g, " ");

      // 2. Persian Punctuation Normalization
      // Remove spaces before punctuation
      text = text.replace(/\s+([؟،.؛:!])/g, '$1');

      // Ensure space after punctuation (if followed by text, and not followed by another punctuation like ...)
      text = text.replace(/([؟،؛:!])([^\s؟،؛:!])/g, '$1 $2');
      text = text.replace(/(\.)([^\s.\d؟،؛:!])/g, '$1 $2');

      // 3. Handle Persian ZWNJ (نیم‌فاصله)
      // Common cases: suffix "ها", "می" prefix
      text = text.replace(/\s+(ها|تر|ترین|بندی|رسانی)(\s|$|[؟،.؛:!])/g, '\u200c$1$2');
      text = text.replace(/(^|\s)(می|بی)\s+/g, '$1$2\u200c');
      text = text.replace(/وب\s+گردی/g, 'وب\u200cگردی');

      // 4. Block boundary trimming
      const parent = node.parentNode;
      if (parent && this.blockTags.has(parent.tagName.toLowerCase())) {
          if (node === parent.firstChild) {
              text = text.replace(/^\s+/, '');
          }
          if (node === parent.lastChild) {
              text = text.replace(/\s+$/, '');
          }
      }

      node.nodeValue = text;
    }
  }

  /* ================= CLEANUP ================= */

  _cleanup(root) {
    this._removeTransientUI(root);
    this._removeEmptyNodesRecursively(root);
  }

  _removeTransientUI(root) {
      // Remove any elements marked as transient UI (like code badges)
      // EXCEPT for <br> elements inside <pre> blocks which represent actual newlines
      const uiElements = Array.from(root.querySelectorAll('[data-penman-ui="true"]'));
      uiElements.forEach(el => {
          let isInsidePre = false;
          let curr = el.parentNode;
          while (curr && curr !== root) {
              if (curr.tagName && curr.tagName.toLowerCase() === 'pre') {
                  isInsidePre = true;
                  break;
              }
              curr = curr.parentNode;
          }
          if (!isInsidePre || el.tagName.toLowerCase() !== 'br') {
              el.remove();
          } else {
              // Convert them to normal BRs so they don't get messed up or stripped out later
              el.removeAttribute('data-penman-ui');
          }
      });
  }

  _removeEmptyNodesRecursively(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
        // Do not remove spans or text nodes representing explicit newlines within codeblocks
        let isInsideCode = false;
        let curr = child.parentNode;
        while (curr) {
            if (curr.tagName && (curr.tagName.toLowerCase() === 'pre' || curr.tagName.toLowerCase() === 'code')) {
                isInsideCode = true;
                break;
            }
            curr = curr.parentNode;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
            // Protected blocks should not be removed even if they appear empty
            if (this._isConfiguredBlock(child) || child.getAttribute('data-penman-core') === 'true') {
                continue;
            }

            if (this._isProtected(child)) {
                continue;
            }
            
            if (isInsideCode && child.textContent === '\n') {
                continue;
            }

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
            if (isInsideCode && child.nodeValue === '\n') {
                continue;
            }
            if (!child.nodeValue.trim() && child.nodeValue !== " ") {
                child.remove();
            }
        }
    }
  }
}
