export function setupListPlugin(editor) {
  editor.ui.registry.addButton('bullist', {
    text: 'Bullet List',
    onAction: function() {
      editor.execCommand('insertUnorderedList');
    }
  });

  editor.ui.registry.addButton('numlist', {
    text: 'Numbered List',
    onAction: function() {
      editor.execCommand('insertOrderedList');
    }
  });
}
