export function setupRemoveFormatPlugin(editor) {
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

      // execCommand('removeFormat') does a lot of this, but it might not remove custom spans.
      // So we use it as a base.
      document.execCommand('removeFormat', false, null);

      nodesToUnwrap.forEach(node => {
          if (node.parentNode) { // Check if it still exists after execCommand
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
    text: 'Clear Formatting',

    onAction: () => {
      editor.execCommand('CLEAR_FORMATTING');
    }
  });
}
