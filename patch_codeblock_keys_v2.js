const fs = require('fs');
let content = fs.readFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', 'utf8');

const keydownLogic = `
  // Intercept keydown inside codeblock
  editor.editableArea.addEventListener('keydown', (e) => {
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

    if (inCodeBlock) {
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        // Insert a newline character
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode('\\n');
        range.insertNode(textNode);

        // Collapse selection after the newline
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);

        if (editor.history) {
            // only push history periodically or it gets too noisy on typing
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        // Insert 2 spaces for indent
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode('  ');
        range.insertNode(textNode);

        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, true);
`;

content = content.replace(/\/\/ Intercept keydown inside codeblock[\s\S]+?\/\/ Intercept Paste inside codeblock/, keydownLogic + "\n  // Intercept Paste inside codeblock");

fs.writeFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', content);
