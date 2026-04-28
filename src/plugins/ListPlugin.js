export function setupListPlugin(editor) {
  const queryListState = (listTag) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== editor.editableArea) {
      if (node.tagName && node.tagName.toLowerCase() === listTag) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  const getSelectedLIs = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return [];
    const range = sel.getRangeAt(0);

    if (!editor.editableArea.contains(range.commonAncestorContainer)) {
      return [];
    }

    if (sel.isCollapsed) {
      let node = range.startContainer;
      while (node && node !== editor.editableArea) {
        if (node.nodeName === 'LI') return [node];
        node = node.parentNode;
      }
      return [];
    }

    const lis = [];
    const allLIs = editor.editableArea.querySelectorAll('li');
    allLIs.forEach(li => {
      if (sel.containsNode(li, true)) {
        lis.push(li);
      }
    });
    return lis;
  };

  editor.commands.register('insertUnorderedList', {
    queryState: () => queryListState('ul')
  });

  editor.commands.register('insertOrderedList', {
    queryState: () => queryListState('ol')
  });

  editor.commands.register('indentList', {
    execute: () => {
      const lis = getSelectedLIs();
      if (lis.length === 0) return;

      editor.selection.save();

      lis.forEach(li => {
        const prev = li.previousElementSibling;
        if (prev && prev.nodeName === 'LI') {
          const parentList = li.parentNode;
          let nestedList = prev.querySelector('ul, ol');
          if (!nestedList) {
            nestedList = document.createElement(parentList.tagName);
            prev.appendChild(nestedList);
          }
          nestedList.appendChild(li);
        }
      });

      editor.selection.restore();
    }
  });

  editor.commands.register('outdentList', {
    execute: () => {
      const lis = getSelectedLIs();
      if (lis.length === 0) return;

      editor.selection.save();

      lis.forEach(li => {
        const parentList = li.parentNode;
        if (!parentList || (parentList.nodeName !== 'UL' && parentList.nodeName !== 'OL')) return;

        // Ensure LI is still valid in current iteration
        if (!editor.editableArea.contains(li)) return;

        const grandparent = parentList.parentNode;
        const nextSiblings = [];
        let next = li.nextElementSibling;
        while (next) {
          nextSiblings.push(next);
          next = next.nextElementSibling;
        }

        if (grandparent && grandparent.nodeName === 'LI') {
          grandparent.parentNode.insertBefore(li, grandparent.nextSibling);
          if (nextSiblings.length > 0) {
            let nested = li.querySelector('ul, ol');
            if (!nested) {
              nested = document.createElement(parentList.tagName);
              li.appendChild(nested);
            }
            nextSiblings.forEach(sib => nested.appendChild(sib));
          }
        } else {
          const p = document.createElement('p');
          const children = Array.from(li.childNodes);
          children.forEach(child => {
            if (child.nodeName !== 'UL' && child.nodeName !== 'OL') {
              p.appendChild(child);
            }
          });

          parentList.parentNode.insertBefore(p, parentList.nextSibling);
          let lastInserted = p;

          children.forEach(child => {
            if (child.nodeName === 'UL' || child.nodeName === 'OL') {
              lastInserted.parentNode.insertBefore(child, lastInserted.nextSibling);
              lastInserted = child;
            }
          });

          if (nextSiblings.length > 0) {
            const newList = document.createElement(parentList.tagName);
            nextSiblings.forEach(sib => newList.appendChild(sib));
            lastInserted.parentNode.insertBefore(newList, lastInserted.nextSibling);
          }
          li.remove();
        }

        if (parentList.childNodes.length === 0) {
          parentList.remove();
        }
      });

      editor.selection.restore();
    }
  });

  editor.ui.registry.addButton('bullist', {
    text: editor.i18n.t('plugins.list.bullet'),
    onAction: function() {
      editor.commands.execute('insertUnorderedList');
    }
  });

  editor.ui.registry.addButton('numlist', {
    text: editor.i18n.t('plugins.list.numbered'),
    onAction: function() {
      editor.commands.execute('insertOrderedList');
    }
  });

  editor.ui.registry.addButton('indentlist', {
    text: editor.i18n.t('plugins.list.indent'),
    onAction: function() {
      editor.commands.execute('indentList');
    }
  });

  editor.ui.registry.addButton('outdentlist', {
    text: editor.i18n.t('plugins.list.outdent'),
    onAction: function() {
      editor.commands.execute('outdentList');
    }
  });

  editor.editableArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const lis = getSelectedLIs();
      if (lis.length > 0) {
        e.preventDefault();
        if (e.shiftKey) {
          editor.commands.execute('outdentList');
        } else {
          editor.commands.execute('indentList');
        }
      }
    }
  });
}
