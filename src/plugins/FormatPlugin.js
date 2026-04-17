export function setupFormatPlugin(editor) {
  const formats = ['bold', 'italic', 'underline', 'strikethrough'];

  const tags = {
    bold: 'strong',
    italic: 'em',
    underline: 'u',
    strikethrough: 's'
  };

  formats.forEach(format => {
    editor.commands.register(format, {
      execute: (ed) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        const tagName = tags[format];
        const tagUpper = tagName.toUpperCase();

        let node = range.startContainer;
        let isWrapped = false;
        let wrapperNode = null;

        while (node && node !== ed.editableArea) {
            if (node.nodeType === 1 && node.tagName === tagUpper) {
                isWrapped = true;
                wrapperNode = node;
                break;
            }
            node = node.parentNode;
        }

        if (isWrapped) {
            // Unwrap
            const docFrag = document.createDocumentFragment();
            while (wrapperNode.firstChild) {
                docFrag.appendChild(wrapperNode.firstChild);
            }
            wrapperNode.parentNode.replaceChild(docFrag, wrapperNode);
        } else {
            // Wrap
            try {
              const el = document.createElement(tagName);
              range.surroundContents(el);
            } catch (e) {
              // Fallback for overlapping selections
              const el = document.createElement(tagName);
              el.appendChild(range.extractContents());
              range.insertNode(el);
            }
        }
      },
      queryState: (ed) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return false;
        let node = sel.getRangeAt(0).startContainer;
        const tagName = tags[format].toUpperCase();
        while (node && node !== ed.editableArea) {
            if (node.nodeType === 1 && node.tagName === tagName) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
      }
    });

    editor.ui.registry.addButton(format, {
      text: format.charAt(0).toUpperCase() + format.slice(1),
      onAction: function() {
        editor.execCommand(format);
      }
    });
  });
}
