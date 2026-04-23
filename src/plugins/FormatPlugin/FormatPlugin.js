export function setupFormatPlugin(editor) {
  const formats = ['bold', 'italic', 'underline', 'strikethrough'];

  const tagMap = {
    bold: 'STRONG',
    italic: 'EM',
    underline: 'U',
    strikethrough: 'S'
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
    const inlineTags = ['STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE'];
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
      // Only contains whitespace or nothing, AND has no text content
      // Note: textContent ignores elements like spans, so an empty tag with a marker span will have textContent === ''
      if (el.textContent.trim() === '') {
        while(el.firstChild) {
           el.parentNode.insertBefore(el.firstChild, el);
        }
        el.parentNode.removeChild(el);
      }
    });
  }

  formats.forEach(format => {
    editor.commands.register(format, {
      queryState: (ed) => {
        return document.queryCommandState(format);
      },
      execute: (ed) => {
        // Core formatting function handling toggle and normalization
        document.execCommand(format);
        
        // Ensure DOM structure is strictly normalized
        ed.selection.save();
        normalizeInline(ed.editableArea);
        ed.selection.restore();
      }
    });

    editor.ui.registry.addButton(format, {
      text: format.charAt(0).toUpperCase() + format.slice(1),
      onAction: function() {
        editor.commands.execute(format);
      }
    });
  });
}
