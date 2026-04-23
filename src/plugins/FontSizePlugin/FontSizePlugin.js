export function setupFontSizePlugin(editor) {
  const fontSizes = editor.options.fontSizes || ['12px', '14px', '16px', '18px', '24px', '32px'];

  // Register command to apply font size
  editor.commands.register('SET_FONT_SIZE', {
    queryState: (editor) => {
      // Find the computed font size of the current selection
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;

      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }

      if (node && node.nodeType === Node.ELEMENT_NODE) {
        // Read inline style or computed style
        const computedStyle = window.getComputedStyle(node);
        return computedStyle.fontSize;
      }
      return false;
    },
    execute: (editor, size) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

      const range = sel.getRangeAt(0);

      // We need to walk the DOM within the selection and wrap text nodes,
      // avoiding nested spans with font-size.
      // Easiest robust approach without complex range splitting:
      // execCommand 'fontSize' with dummy value 7, then replace <font size="7"> with spans.
      // But we must also clean up existing font-size spans within the selection to avoid nesting.

      // Find existing spans with font-size in the selection and remove their font-size style
      const commonAncestor = range.commonAncestorContainer;
      const container = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentNode : commonAncestor;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
         acceptNode: (node) => {
             if (node.tagName.toLowerCase() === 'span' && node.style.fontSize) {
                 if (sel.containsNode(node, true)) {
                     return NodeFilter.FILTER_ACCEPT;
                 }
             }
             return NodeFilter.FILTER_SKIP;
         }
      });

      const spansToClean = [];
      let currentNode = walker.nextNode();
      while(currentNode) {
          spansToClean.push(currentNode);
          currentNode = walker.nextNode();
      }

      document.execCommand('fontSize', false, '7');

      spansToClean.forEach(span => {
         span.style.fontSize = '';
         // if span has no other styles or classes or ids, we could unwrap it, but keeping it empty is mostly harmless and handled by normalization if implemented.
         if (span.getAttribute('style') === '') {
             span.removeAttribute('style');
         }
      });

      const fontTags = editor.editableArea.querySelectorAll('font[size="7"]');
      fontTags.forEach(fontNode => {
          const newSpan = document.createElement('span');
          newSpan.style.fontSize = size;
          while(fontNode.firstChild) {
              newSpan.appendChild(fontNode.firstChild);
          }
          fontNode.parentNode.replaceChild(newSpan, fontNode);
      });

      // Also check if the container itself was a span that we were completely inside of
      if (container.tagName && container.tagName.toLowerCase() === 'span' && container.style.fontSize) {
         if (range.startContainer === container.firstChild && range.endContainer === container.lastChild) {
             container.style.fontSize = size;
         }
      }
    }
  });

  const renderDropdownContent = () => {
    const container = document.createElement('div');
    container.className = 'penman-fontsize-list';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.maxHeight = '200px';
    container.style.overflowY = 'auto';

    fontSizes.forEach(size => {
      const item = document.createElement('div');
      item.className = 'penman-fontsize-item';
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.fontSize = size;
      item.textContent = size;

      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep selection
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        editor.execCommand('SET_FONT_SIZE', size);
        document.body.click(); // Close dropdown
      });

      container.appendChild(item);
    });

    return container;
  };

  editor.ui.registry.addDropdown('fontsize', {
    text: 'Size',
    render: renderDropdownContent,
    onOpen: () => {
      editor.selection.save();
    },
    onClose: () => {
      editor.selection.clearSaved();
    }
  });

  // Listen to selection changes to update the active font size
  editor.on('selectionChange', () => {
    const activeSize = editor.commands.queryState('SET_FONT_SIZE');
    if (activeSize) {
      const btn = editor.container.querySelector('.penman-btn-fontsize');
      if (btn) {
        btn.textContent = activeSize;
      }
    }
  });
}
