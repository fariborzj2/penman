export function setupListPlugin(editor) {
  const queryListState = (listTag) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== editor.editableArea) {
      if (node.tagName && node.tagName.toLowerCase() === listTag) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  editor.commands.register('insertUnorderedList', {
    queryState: () => queryListState('ul')
  });

  editor.commands.register('insertOrderedList', {
    queryState: () => queryListState('ol')
  });

  editor.ui.registry.addButton('bullist', {
    text: 'Bullet List',
    onAction: function() {
      editor.commands.execute('insertUnorderedList');
    }
  });

  editor.ui.registry.addButton('numlist', {
    text: 'Numbered List',
    onAction: function() {
      editor.commands.execute('insertOrderedList');
    }
  });
}
