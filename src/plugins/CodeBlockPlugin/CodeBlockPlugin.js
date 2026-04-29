export function setupCodeBlockPlugin(editor) {
  editor.ui.registry.addButton('codeblock', {
    iconName: 'codeblock',
    text: editor.i18n.t('plugins.codeBlock.title') || 'Code Block',
    onAction: () => {
      editor.execCommand('INSERT_CODEBLOCK');
    }
  });

  // Track active state of codeblock button
  editor.on('selectionChange', () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.getRangeAt(0).startContainer;
    let inCodeBlock = false;
    while (node && node !== editor.editableArea) {
      if (node.tagName && (node.tagName.toLowerCase() === 'pre' || node.tagName.toLowerCase() === 'code')) {
        inCodeBlock = true;
        break;
      }
      node = node.parentNode;
    }

    const btn = editor.container.querySelector('.penman-btn-codeblock');
    if (btn) {
      if (inCodeBlock) {
        btn.classList.add('penman-btn-active');
      } else {
        btn.classList.remove('penman-btn-active');
      }
    }
  });

  editor.commands.register('INSERT_CODEBLOCK', {
    execute: () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.getRangeAt(0).startContainer;
    let inCodeBlock = false;
    let codeNode = null;
    while (node && node !== editor.editableArea) {
      if (node.tagName && (node.tagName.toLowerCase() === 'pre' || node.tagName.toLowerCase() === 'code')) {
        inCodeBlock = true;
        codeNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (inCodeBlock) {
        // Exit code block by converting pre to p
        let preNode = codeNode.tagName.toLowerCase() === 'pre' ? codeNode : codeNode.parentNode;
        if (preNode && preNode.tagName.toLowerCase() === 'pre') {
             const p = document.createElement('p');
             while (preNode.firstChild) {
                 // if child is code, move its children instead
                 let child = preNode.firstChild;
                 if (child.tagName && child.tagName.toLowerCase() === 'code') {
                     while(child.firstChild) {
                         p.appendChild(child.firstChild);
                     }
                     child.remove();
                 } else {
                     p.appendChild(child);
                 }
             }
             preNode.parentNode.replaceChild(p, preNode);

             // restore selection
             const newSel = window.getSelection();
             newSel.removeAllRanges();
             const newRange = document.createRange();
             newRange.selectNodeContents(p);
             newRange.collapse(false);
             newSel.addRange(newRange);
        }
        return;
    } else {
        // Format as pre by creating a pre node and wrapping content
        const pNode = sel.getRangeAt(0).commonAncestorContainer;
        let blockNode = pNode.nodeType === 3 ? pNode.parentNode : pNode;
        while (blockNode && blockNode !== editor.editableArea && !editor.sanitizer.blockTags.has(blockNode.tagName.toLowerCase())) {
            blockNode = blockNode.parentNode;
        }

        if (blockNode && blockNode !== editor.editableArea) {
             const pre = document.createElement('pre');
             const code = document.createElement('code');
             pre.appendChild(code);

             pre.setAttribute('dir', 'ltr');
             pre.style.textAlign = 'left';
             pre.style.whiteSpace = 'pre-wrap';
             pre.style.fontFamily = 'monospace';
             pre.style.backgroundColor = '#f4f4f4';
             pre.style.padding = '10px';
             pre.style.borderRadius = '5px';
             pre.style.overflowX = 'auto';
             code.setAttribute('dir', 'ltr');
             code.style.fontFamily = 'monospace';

             while (blockNode.firstChild) {
                 code.appendChild(blockNode.firstChild);
             }

             blockNode.parentNode.replaceChild(pre, blockNode);

             // Restore selection inside code
             const newSel = window.getSelection();
             newSel.removeAllRanges();
             const newRange = document.createRange();
             newRange.selectNodeContents(code);
             newRange.collapse(false);
             newSel.addRange(newRange);
        } else {
             document.execCommand('formatBlock', false, 'pre');
             // Ensure direction and styling on native fallback
             const newSel = window.getSelection();
             if (newSel && newSel.rangeCount > 0) {
                let newNode = newSel.getRangeAt(0).startContainer;
                while(newNode && newNode !== editor.editableArea) {
                    if (newNode.tagName && newNode.tagName.toLowerCase() === 'pre') {
                        newNode.setAttribute('dir', 'ltr');
                        newNode.style.textAlign = 'left';
                        newNode.style.whiteSpace = 'pre-wrap';
                        newNode.style.fontFamily = 'monospace';
                        newNode.style.backgroundColor = '#f4f4f4';
                        newNode.style.padding = '10px';
                        newNode.style.borderRadius = '5px';
                        newNode.style.overflowX = 'auto';

                        // we should wrap its content with a code tag
                        if (!newNode.querySelector('code')) {
                            const codeTag = document.createElement('code');
                            codeTag.setAttribute('dir', 'ltr');
                            codeTag.style.fontFamily = 'monospace';
                            while(newNode.firstChild) {
                                codeTag.appendChild(newNode.firstChild);
                            }
                            newNode.appendChild(codeTag);
                        }
                        break;
                    }
                    newNode = newNode.parentNode;
                }
             }
        }
    }
    }
  });

  // Intercept Paste inside codeblock
  editor.editableArea.addEventListener('paste', (e) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.getRangeAt(0).startContainer;
    let inCodeBlock = false;
    let codeNode = null;
    while (node && node !== editor.editableArea) {
      if (node.tagName && (node.tagName.toLowerCase() === 'pre' || node.tagName.toLowerCase() === 'code')) {
        inCodeBlock = true;
        codeNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (inCodeBlock) {
      e.preventDefault();
      e.stopPropagation();

      const clipboardData = (e.originalEvent || e).clipboardData;
      let text = clipboardData.getData('text/plain');

      if (text) {
          // Insert plain text at cursor
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);

          if (editor.history) {
            editor.history.pushImmediate();
          }
      }
    }
  }, true); // use capture phase to intercept before Editor.js handles it
}
