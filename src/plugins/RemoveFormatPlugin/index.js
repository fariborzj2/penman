import { removeInlineFormatting } from '../../utils/domCommands.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

export function setupRemoveFormatPlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.removeFormat', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  const inlineTags = ['strong', 'em', 'b', 'i', 'u', 'span', 'a', 'mark', 's', 'strike'];

  editor.commands.register('CLEAR_FORMATTING', {
    queryState: () => false, // Always false (it's an action button)
    execute: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

      const range = sel.getRangeAt(0);

      const commonAncestor = range.commonAncestorContainer;
      const container = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentNode : commonAncestor;

      // Get all elements within the container that intersect with the range before any modification
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
         acceptNode: (node) => {
             if (inlineTags.includes(node.tagName.toLowerCase())) {
                 // Check if it intersects the range
                 if (sel.containsNode(node, true)) {
                     return NodeFilter.FILTER_ACCEPT;
                 }
             }
             return NodeFilter.FILTER_SKIP;
         }
      });

      const nodesToUnwrap = [];
      let currentNode = walker.nextNode();
      while(currentNode) {
          nodesToUnwrap.push(currentNode);
          currentNode = walker.nextNode();
      }

      // Native selection-based inline-format removal. Walks every inline
      // wrapper that overlaps the selection (STRONG/EM/U/S/SUB/SUP/MARK/
      // FONT/SPAN) and unwraps it, then restores the selection over the
      // same character range. Replaces document.execCommand('removeFormat').
      removeInlineFormatting(editor.editableArea);

      nodesToUnwrap.forEach(node => {
          if (node.parentNode) { // Check if it still exists after the unwrap pass
              const parent = node.parentNode;
              while(node.firstChild) {
                  parent.insertBefore(node.firstChild, node);
              }
              parent.removeChild(node);
          }
      });
    }
  });

  editor.ui.registry.addButton('removeformat', {
    text: editor.i18n.t('plugins.removeFormat.title'),

    onAction: () => {
      editor.execCommand('CLEAR_FORMATTING');
    }
  });
}
