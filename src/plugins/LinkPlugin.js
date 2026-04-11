export function setupLinkPlugin(editor) {
  editor.ui.registry.addButton('link', {
    text: 'Insert Link',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    onAction: function() {
      const url = prompt("Enter link URL:");
      if (url) {
        editor.insertContent(`<a href="${url}">[Link]</a>`);
      }
    }
  });
}
