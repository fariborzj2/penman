export function setupFormatPlugin(editor) {
  const formats = ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript'];

  const tagMap = {
    bold: 'STRONG',
    italic: 'EM',
    underline: 'U',
    strikethrough: 'S',
    superscript: 'SUP',
    subscript: 'SUB'
  };

  function replaceTag(oldTag, newTagName) {
    const newTag = document.createElement(newTagName);
    while (oldTag.firstChild) {
      newTag.appendChild(oldTag.firstChild);
    }
    oldTag.parentNode.replaceChild(newTag, oldTag);
  }

  function normalizeInline(rootNode) {
    const inlineTagsMap = {
      'B': 'STRONG',
      'I': 'EM',
      'STRIKE': 'S'
    };
    const inlineTags = ['STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'SUP', 'SUB'];
    const tagSelector = inlineTags.join(', ');

    // 1. Standardize tags
    Array.from(rootNode.querySelectorAll('b, i, strike')).forEach(node => {
      replaceTag(node, inlineTagsMap[node.nodeName] || node.nodeName);
    });

    // 2. Flatten nested identical tags
    Array.from(rootNode.querySelectorAll(tagSelector)).forEach(el => {
      if (!el.parentNode) return;
      let parent = el.parentNode;
      let isNested = false;
      while (parent && parent !== rootNode) {
        if (parent.nodeName === el.nodeName) {
          isNested = true;
          break;
        }
        parent = parent.parentNode;
      }
      
      if (isNested) {
        while (el.firstChild) {
          el.parentNode.insertBefore(el.firstChild, el);
        }
        el.parentNode.removeChild(el);
      }
    });

    // 3. Merge adjacent identical tags
    let merged = true;
    while (merged) {
      merged = false;
      const elements = Array.from(rootNode.querySelectorAll(tagSelector));
      for (const el of elements) {
        if (!el.parentNode) continue;
        
        let next = el.nextSibling;
        // Skip empty text nodes
        while (next && next.nodeType === 3 && next.textContent === '') {
          let temp = next;
          next = next.nextSibling;
          temp.parentNode.removeChild(temp);
        }

        if (next && next.nodeType === 1 && next.nodeName === el.nodeName) {
          while (next.firstChild) {
            el.appendChild(next.firstChild);
          }
          next.parentNode.removeChild(next);
          merged = true;
        }
      }
    }

    // 4. Remove empty tags (unwrap them to preserve markers/spans)
    Array.from(rootNode.querySelectorAll(tagSelector)).forEach(el => {
      if (!el.parentNode) return;
      if (el.textContent.trim() === '') {
        while(el.firstChild) {
           el.parentNode.insertBefore(el.firstChild, el);
        }
        el.parentNode.removeChild(el);
      }
    });
  }

  // Pending formatting state
  editor._pendingFormats = new Set();

  editor.editableArea.addEventListener('keydown', (e) => {
    // Only intercept character typing
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && editor._pendingFormats.size > 0) {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed) return;

      e.preventDefault();
      
      let node = document.createTextNode(e.key);
      let wrapper = null;
      let innerMost = null;

      // Create formatting wrappers
      Array.from(editor._pendingFormats).forEach(format => {
        const tagName = tagMap[format];
        if (tagName) {
          const el = document.createElement(tagName);
          if (!wrapper) {
            wrapper = el;
            innerMost = el;
          } else {
            innerMost.appendChild(el);
            innerMost = el;
          }
        }
      });

      if (wrapper) {
        innerMost.appendChild(node);
        const range = sel.getRangeAt(0);
        range.insertNode(wrapper);
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      editor._pendingFormats.clear();
      editor.emit('change', editor.getContent());
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key.startsWith('Arrow')) {
       // Clear pending formats on navigation or deletion
       editor._pendingFormats.clear();
    }
  });

  // Clear pending formats if selection changes by clicking
  editor.editableArea.addEventListener('mousedown', () => {
    editor._pendingFormats.clear();
  });

  formats.forEach(format => {
    editor.commands.register(format, {
      queryState: (ed) => {
        if (ed._pendingFormats.has(format)) return true;
        return document.queryCommandState(format);
      },
      execute: (ed) => {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
           if (ed._pendingFormats.has(format)) {
               ed._pendingFormats.delete(format);
           } else {
               // If the cursor is already inside the format natively, we should un-format it.
               if (document.queryCommandState(format)) {
                  document.execCommand(format); // native toggle off for collapsed
               } else {
                  ed._pendingFormats.add(format);
               }
           }

           // Force UI update
           ed.emit('selectionChange');
           return;
        }

        // Core formatting function handling toggle and normalization for non-collapsed.
        // We rely on the browser's `document.execCommand(format)` because it
        // correctly handles partial selections (e.g. unbolding a single word
        // inside an already-bold sentence). Hand-rolled DOM splitting via
        // Range.extractContents loses the surrounding wrapper structure in
        // common cases, so the native command remains the most robust option
        // until execCommand is removed from browsers.
        document.execCommand(format);

        // Ensure DOM structure is strictly normalized
        ed.selection.save();
        normalizeInline(ed.editableArea);
        ed.selection.restore();
      }
    });

    editor.ui.registry.addButton(format, {
      text: editor.i18n.t(`core.${format}`) !== `core.${format}` ? editor.i18n.t(`core.${format}`) : (format.charAt(0).toUpperCase() + format.slice(1)),
      onAction: function() {
        editor.commands.execute(format);
      }
    });
  });
}
