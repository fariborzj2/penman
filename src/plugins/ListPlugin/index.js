import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

export function setupListPlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.list', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

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

    // Collapsed selection: walk up to find the containing LI
    if (sel.isCollapsed) {
      let node = range.startContainer;
      while (node && node !== editor.editableArea) {
        if (node.nodeName === 'LI') return [node];
        node = node.parentNode;
      }
      return [];
    }

    // Non-collapsed: find the LI that contains the startContainer
    // and collect all LIs from there to the one containing endContainer
    const startLI = (() => {
      let n = range.startContainer;
      while (n && n !== editor.editableArea) {
        if (n.nodeName === 'LI') return n;
        n = n.parentNode;
      }
      return null;
    })();

    const endLI = (() => {
      let n = range.endContainer;
      while (n && n !== editor.editableArea) {
        if (n.nodeName === 'LI') return n;
        n = n.parentNode;
      }
      return null;
    })();

    if (!startLI) return [];
    if (startLI === endLI || !endLI) return [startLI];

    // Collect all LIs between startLI and endLI (inclusive) in document order
    const allLIs = Array.from(editor.editableArea.querySelectorAll('li'));
    const startIdx = allLIs.indexOf(startLI);
    const endIdx = allLIs.indexOf(endLI);
    if (startIdx === -1) return [startLI];
    const from = Math.min(startIdx, endIdx);
    const to = Math.max(startIdx, endIdx);
    return allLIs.slice(from, to + 1);
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

      // Filter out first-item LIs that have no previous sibling — they cannot be indented
      const indentable = lis.filter(li => {
        const prev = li.previousElementSibling;
        return prev && prev.nodeName === 'LI';
      });

      if (indentable.length === 0) return;

      editor.selection.save();

      indentable.forEach(li => {
        const prev = li.previousElementSibling;
        if (prev && prev.nodeName === 'LI') {
          const parentList = li.parentNode;
          // Look only at direct children of prev for an existing nested list
          let nestedList = Array.from(prev.childNodes).find(
            n => n.nodeName === 'UL' || n.nodeName === 'OL'
          );
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

        if (grandparent && grandparent.nodeName === 'LI') {
          // Nested case: move li up to be a sibling after grandparent LI
          const nextSiblings = [];
          let next = li.nextElementSibling;
          while (next) {
            nextSiblings.push(next);
            next = next.nextElementSibling;
          }

          grandparent.parentNode.insertBefore(li, grandparent.nextSibling);

          if (nextSiblings.length > 0) {
            let nested = Array.from(li.childNodes).find(
              n => n.nodeName === 'UL' || n.nodeName === 'OL'
            );
            if (!nested) {
              nested = document.createElement(parentList.tagName);
              li.appendChild(nested);
            }
            nextSiblings.forEach(sib => nested.appendChild(sib));
          }
        } else {
          // Top-level case: convert LI to a <p> and place it before the list
          const nextSiblings = [];
          let next = li.nextElementSibling;
          while (next) {
            nextSiblings.push(next);
            next = next.nextElementSibling;
          }

          const p = document.createElement('p');
          // Move only inline/text children (not nested lists) into the <p>
          const liChildren = Array.from(li.childNodes);
          liChildren.forEach(child => {
            if (child.nodeName !== 'UL' && child.nodeName !== 'OL') {
              p.appendChild(child);
            }
          });

          // Insert <p> before the parent list
          parentList.parentNode.insertBefore(p, parentList);
          let lastInserted = p;

          // Re-attach any nested lists that were inside the LI
          liChildren.forEach(child => {
            if ((child.nodeName === 'UL' || child.nodeName === 'OL') && child.parentNode) {
              lastInserted.parentNode.insertBefore(child, lastInserted.nextSibling);
              lastInserted = child;
            }
          });

          // If there were siblings after the outdented LI, put them in a new list after
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
