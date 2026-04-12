export function setupUnlinkPlugin(editor) {
  editor.commands.register('REMOVE_LINK', {
    queryState: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;

      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== editor.editableArea) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a') {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },
    execute: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);

      // Simple implementation: Use execCommand 'unlink' which works reasonably well across browsers
      // for selections that contain links.
      document.execCommand('unlink', false, null);

      // We also need to check if we are collapsed inside a link. If so, execCommand('unlink') might not work
      // depending on the browser.
      if (range.collapsed) {
         let node = range.startContainer;
         let linkNode = null;
         while (node && node !== editor.editableArea) {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a') {
               linkNode = node;
               break;
            }
            node = node.parentNode;
         }

         if (linkNode) {
            // Unwrap the link node
            const parent = linkNode.parentNode;
            while(linkNode.firstChild) {
                parent.insertBefore(linkNode.firstChild, linkNode);
            }
            parent.removeChild(linkNode);
         }
      }
    }
  });

  editor.ui.registry.addButton('unlink', {
    text: 'Unlink',
    icon: 'unlink',
    onAction: () => {
      editor.execCommand('REMOVE_LINK');
    }
  });
}
