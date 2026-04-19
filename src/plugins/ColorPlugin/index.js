import { ColorPicker } from '../../ui/ColorPicker.js';

export function setupColorPlugin(editor) {
  // --- Text Color ---
  editor.commands.register('SET_TEXT_COLOR', {
    queryState: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const computedStyle = window.getComputedStyle(node);
        return computedStyle.color;
      }
      return false;
    },
    execute: (editor, hex) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      applyStyleToSelection(editor, 'color', hex);
    }
  });

  // --- Highlight Color ---
  editor.commands.register('SET_HIGHLIGHT_COLOR', {
    queryState: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const computedStyle = window.getComputedStyle(node);
        return computedStyle.backgroundColor;
      }
      return false;
    },
    execute: (editor, hex) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      applyStyleToSelection(editor, 'background-color', hex);
    }
  });

  function applyStyleToSelection(editor, styleProp, value) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const isRemoving = !value || value === 'transparent' || value === 'remove';

    // Strategy similar to FontSizePlugin to prevent conflicts and ensure robust splitting

    // 1. Clean existing identical styles inside the selection so they don't block our new style
    const commonAncestor = range.commonAncestorContainer;
    const container = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentNode : commonAncestor;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
       acceptNode: (node) => {
           if (node.tagName.toLowerCase() === 'span' && node.style.getPropertyValue(styleProp)) {
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

    // Wrap the selected text natively using fontSize as a proxy
    document.execCommand('fontSize', false, '7');

    spansToClean.forEach(span => {
       span.style.removeProperty(styleProp);
       if (span.getAttribute('style') === '') {
           span.removeAttribute('style');
       }
    });

    const fontTags = editor.editableArea.querySelectorAll('font[size="7"]');
    fontTags.forEach(fontNode => {
        const newSpan = document.createElement('span');

        if (!isRemoving) {
            newSpan.style.setProperty(styleProp, value);
        }

        while(fontNode.firstChild) {
            newSpan.appendChild(fontNode.firstChild);
        }
        fontNode.parentNode.replaceChild(newSpan, fontNode);
    });

    // Also update container if selection completely matches a span container
    if (container.tagName && container.tagName.toLowerCase() === 'span' && container.style.getPropertyValue(styleProp)) {
       if (range.startContainer === container.firstChild && range.endContainer === container.lastChild) {
           if (isRemoving) {
               container.style.removeProperty(styleProp);
               if (container.getAttribute('style') === '') container.removeAttribute('style');
           } else {
               container.style.setProperty(styleProp, value);
           }
       }
    }

    // After applying styles, forcefully run the span merge algorithm to prevent deep nesting bugs
    // The editor uses a unified sanitizer which includes mergeNestedSpans.
    // However, invoking the whole sanitizer can be heavy. Let's just call the specific normalizer
    // or rely on CommandManager's normalizeDOM. We'll explicitly call the Sanitizer's span merge directly
    // since it is precisely designed for this.
    if (editor.sanitizer && typeof editor.sanitizer._mergeNestedSpans === 'function') {
        editor.sanitizer._mergeNestedSpans(editor.editableArea);
    }
  }

  // UI rendering logic
  const renderDropdownContent = (command) => {
    const container = document.createElement('div');
    container.className = 'penman-color-picker-container';

    const picker = new ColorPicker({
      onChange: (hex, final) => {
        editor.execCommand(command, hex);
        if (final) {
          // Close the dropdown when color is picked
          document.body.click();
        }
      }
    });

    container.appendChild(picker.getElement());
    return container;
  };

  editor.ui.registry.addDropdown('textcolor', {
    text: 'Text Color',
    icon: editor.ui.iconProvider.getIcon('textcolor') || '<span style="font-weight:bold;color:red;">A</span>',
    render: () => renderDropdownContent('SET_TEXT_COLOR'),
    onOpen: () => editor.selection.save(),
    onClose: () => editor.selection.clearSaved()
  });

  editor.ui.registry.addDropdown('highlight', {
    text: 'Highlight',
    icon: editor.ui.iconProvider.getIcon('highlight') || '<span style="background-color:yellow;">H</span>',
    render: () => renderDropdownContent('SET_HIGHLIGHT_COLOR'),
    onOpen: () => editor.selection.save(),
    onClose: () => editor.selection.clearSaved()
  });
}
