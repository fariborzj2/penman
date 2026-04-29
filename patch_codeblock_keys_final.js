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
            editor.history.pushImmediate();
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

        if (editor.history) {
            editor.history.pushImmediate();
        }
      }
    }
  }, true);
`;

if (!content.includes("e.key === 'Enter'")) {
    content = content.replace("  // Intercept Paste inside codeblock", keydownLogic + "\n  // Intercept Paste inside codeblock");
    fs.writeFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', content);
}
