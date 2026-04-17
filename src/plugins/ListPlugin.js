export function setupListPlugin(editor) {
  const applyList = (listTag) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentNode;

    // Check if we are inside a list already
    let currentList = null;
    let currentNode = node;
    while (currentNode && currentNode !== editor.editableArea) {
      if (currentNode.tagName === 'UL' || currentNode.tagName === 'OL') {
        currentList = currentNode;
        break;
      }
      currentNode = currentNode.parentNode;
    }

    if (currentList) {
      if (currentList.tagName.toLowerCase() === listTag) {
        // Unwrap: we are in the same list type, so convert li back to p
        const listItems = Array.from(currentList.children);
        const fragment = document.createDocumentFragment();
        listItems.forEach(li => {
          const p = document.createElement('p');
          while (li.firstChild) {
            p.appendChild(li.firstChild);
          }
          fragment.appendChild(p);
        });
        currentList.parentNode.replaceChild(fragment, currentList);
        return;
      } else {
        // Change list type
        const newList = document.createElement(listTag);
        while (currentList.firstChild) {
          newList.appendChild(currentList.firstChild);
        }
        currentList.parentNode.replaceChild(newList, currentList);
        return;
      }
    }

    // Wrap in list: we assume we are in a block like <p>
    let blockNode = node;
    while (blockNode && blockNode !== editor.editableArea) {
      // Find a block element (like p, h1, etc.) to convert to li
      const display = window.getComputedStyle(blockNode).display;
      if (display === 'block' || display === 'list-item') {
        break;
      }
      blockNode = blockNode.parentNode;
    }

    if (blockNode && blockNode !== editor.editableArea) {
      const list = document.createElement(listTag);
      const li = document.createElement('li');

      // Move contents of the block into the list item
      while (blockNode.firstChild) {
        li.appendChild(blockNode.firstChild);
      }
      list.appendChild(li);

      // Replace the block node with the list
      blockNode.parentNode.replaceChild(list, blockNode);
    } else {
      // Fallback if no block element found
      const range = sel.getRangeAt(0);
      const list = document.createElement(listTag);
      const li = document.createElement('li');

      try {
        li.appendChild(range.extractContents());
        list.appendChild(li);
        range.insertNode(list);
      } catch (e) {
        // Ignore fallback errors
      }
    }
  };

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
    execute: () => applyList('ul'),
    queryState: () => queryListState('ul')
  });

  editor.commands.register('insertOrderedList', {
    execute: () => applyList('ol'),
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
