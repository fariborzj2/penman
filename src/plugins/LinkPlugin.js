export function setupLinkPlugin(editor) {
  editor.ui.registry.addButton('link', {
    text: 'Insert Link',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    onAction: function() {
      // Save current selection before opening the modal so we know where to insert
      editor.selection.save();

      editor.ui.createModal({
        title: 'Insert Link',
        body: `
          <div>
            <label for="penman-link-url">URL</label>
            <input type="url" id="penman-link-url" name="url" placeholder="https://example.com" required>
          </div>
          <div style="margin-top: 10px;">
            <label for="penman-link-text">Text to display</label>
            <input type="text" id="penman-link-text" name="text" placeholder="Link text">
          </div>
        `,
        onSubmit: (data) => {
          if (data.url) {
            // Restore selection to the saved position
            editor.selection.restore();

            const text = data.text || data.url;
            editor.insertContent(`<a href="${data.url}">${text}</a>`);
          } else {
            // Always restore selection even if cancelled/invalid so focus is returned to editor
            editor.selection.restore();
          }
        }
      });
    }
  });
}
