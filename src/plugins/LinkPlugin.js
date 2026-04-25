/**
 * Simple HTML attribute escaper to prevent quotes from breaking HTML structure
 */
function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}

export function setupLinkPlugin(editor) {
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
    onAction: () => {
      editor.execCommand('REMOVE_LINK');
    }
  });

  editor.ui.registry.addButton('link', {
    text: 'Insert Link',
    onAction: function() {
      // Get the currently selected text before saving markers
      const sel = editor.selection.getSelection();
      let currentText = '';
      if (sel && sel.rangeCount > 0) {
        currentText = sel.toString();
      }

      // Save current selection before opening the modal so we know where to insert
      editor.selection.save();

      editor.ui.createModal({
        title: 'Insert Link',
        body: `
          <div style="padding: 15px">
            <div class="penman-modal-form-row">
              <label for="penman-link-url">URL</label>
              <input type="url" id="penman-link-url" name="url" placeholder="https://example.com" required>
            </div>
            <div class="penman-modal-form-row">
              <label for="penman-link-text">Text to display</label>
              <input type="text" id="penman-link-text" name="text" placeholder="Link text" value="${currentText}">
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label for="penman-link-target">Target</label>
                <select id="penman-link-target" name="target" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 3px;">
                  <option value="">None</option>
                  <option value="_blank">New Window (_blank)</option>
                  <option value="_self">Same Window (_self)</option>
                  <option value="_parent">Parent Frame (_parent)</option>
                  <option value="_top">Top Frame (_top)</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label for="penman-link-rel">Rel</label>
                <input type="text" id="penman-link-rel" name="rel" placeholder="e.g. nofollow">
              </div>
            </div>
          </div>
        `,
        onSubmit: (data) => {
          // Restore selection to the saved position
          editor.selection.restore();

          if (data.url) {
            const safeUrl = escapeHtmlAttr(data.url);
            // We escape text as well to avoid accidental HTML injection through the display text
            const safeText = data.text ? escapeHtmlAttr(data.text) : safeUrl;

            const targetAttr = data.target ? ` target="${escapeHtmlAttr(data.target)}"` : '';
            const relAttr = data.rel ? ` rel="${escapeHtmlAttr(data.rel)}"` : '';

            editor.insertContent(`<a href="${safeUrl}"${targetAttr}${relAttr}>${safeText}</a>`);
          }
        },
        onCancel: () => {
          // Always restore selection if cancelled so hidden markers are cleaned up
          editor.selection.restore();
        }
      });
    }
  });
}
