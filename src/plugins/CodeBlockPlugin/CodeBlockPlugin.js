// src/plugins/CodeBlockPlugin/CodeBlockPlugin.js

/**
 * Native Regex-based tokenizer for JavaScript
 * Designed for extreme performance and absolute string preservation.
 */
import { highlight } from '../../syntax/index.js';

// Inject syntax styles
const styleId = 'penman-syntax-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .tok-keyword { color: #c678dd; }
        .tok-string { color: #98c379; }
        .tok-comment { color: #5c6370; font-style: italic; }
        .tok-number { color: #d19a66; }
        .tok-operator { color: #56b6c2; }
        .tok-punctuation { color: #abb2bf; }
        pre {
            background-color: #282c34;
            overflow-x: auto;
        }
    `;
    document.head.appendChild(style);
}

function getCursorOffset(codeNode) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;

    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    
    // Select contents of the entire code node up to the caret
    preCaretRange.selectNodeContents(codeNode);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    // Use an invisible div to safely extract raw text content length
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(preCaretRange.cloneContents());
    return tempDiv.textContent.length;
}

/**
 * Restores the cursor position to a specific absolute character offset inside the code node.
 */
function setCursorOffset(codeNode, offset) {
    if (offset < 0) return;
    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let nodeStack = [codeNode];
    let node;
    let found = false;
    let lastTextNode = null;

    while (nodeStack.length > 0 && !found) {
        node = nodeStack.pop();
        if (node.nodeType === 3) {
            const nextCharCount = charCount + node.length;
            if (offset <= nextCharCount) {
                range.setStart(node, offset - charCount);
                range.collapse(true);
                found = true;
            }
            charCount = nextCharCount;
            lastTextNode = node;
        } else {
            // Push children in reverse order so they are popped in normal document order
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    // Edge case: offset is at the very end of the last text node
    if (!found && lastTextNode && charCount === offset) {
        range.setStart(lastTextNode, lastTextNode.length);
        range.collapse(true);
        found = true;
    }

    if (found) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function healAndPatch(preNode) {
    if (preNode.getAttribute('dir') !== 'ltr') preNode.setAttribute('dir', 'ltr');
    // Heal any stray text inserted directly into <pre> (bypassing <code>)
    const offset = getCursorOffset(preNode);
    const rawText = preNode.textContent || '';
    
    let codeNode = preNode.querySelector('code');
    if (!codeNode) {
        codeNode = document.createElement('code');
        codeNode.setAttribute('dir', 'ltr');
        codeNode.style.fontFamily = 'inherit';
        preNode.appendChild(codeNode);
    }

    // Remove everything else in the <pre> to maintain strict structure
    Array.from(preNode.childNodes).forEach(child => {
        if (child !== codeNode) {
            preNode.removeChild(child);
        }
    });

    // Re-highlight the <code> block with the full text
    codeNode.innerHTML = highlight(rawText, codeNode.getAttribute('data-language') || 'javascript');
    if (!codeNode.innerHTML.endsWith('<br data-penman-ui="true">') && !codeNode.innerHTML.endsWith('<br>')) {
        codeNode.insertAdjacentHTML('beforeend', '<br data-penman-ui="true">');
    }

    // Restore absolute cursor relative to the code block now that everything is inside it
    setCursorOffset(codeNode, offset);
}

export function setupCodeBlockPlugin(editor) {
    editor.ui.registry.addButton('codeblock', {
        iconName: 'codeblock',
        text: editor.i18n.t('plugins.codeBlock.title') || 'Code Block',
        onAction: () => {
            editor.execCommand('INSERT_CODEBLOCK');
        }
    });

    editor.commands.register('INSERT_CODEBLOCK', {
        execute: (editor) => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;

            let node = sel.getRangeAt(0).startContainer;
            let inCodeBlock = false;
            let codeNode = null;
            let preNode = null;
            while (node && node !== editor.editableArea) {
                if (node.tagName && node.tagName.toLowerCase() === 'pre') {
                    inCodeBlock = true;
                    preNode = node;
                    codeNode = preNode.querySelector('code');
                    break;
                }
                node = node.parentNode;
            }

            if (inCodeBlock) {
                // Exit code block: Convert <pre><code> back to <p>
                if (preNode && preNode.tagName.toLowerCase() === 'pre') {
                    const p = document.createElement('p');
                    const text = codeNode.textContent || '';
                    if (text.includes('\n')) {
                        const lines = text.split('\n');
                        lines.forEach((line, index) => {
                            p.appendChild(document.createTextNode(line));
                            if (index < lines.length - 1) {
                                p.appendChild(document.createElement('br'));
                            }
                        });
                    } else {
                        p.textContent = text;
                    }
                    if (p.innerHTML === '') p.innerHTML = '<br>';
                    preNode.parentNode.replaceChild(p, preNode);

                    // Restore selection
                    const newSel = window.getSelection();
                    newSel.removeAllRanges();
                    const newRange = document.createRange();
                    newRange.selectNodeContents(p);
                    newRange.collapse(false);
                    newSel.addRange(newRange);
                }
                if (editor.history) editor.history.pushImmediate();
            } else {
                // Enter code block: Wrap current block with <pre><code>
                const pNode = sel.getRangeAt(0).commonAncestorContainer;
                let blockNode = pNode.nodeType === 3 ? pNode.parentNode : pNode;
                while (blockNode && blockNode !== editor.editableArea && (!editor.sanitizer || !editor.sanitizer.blockTags.has(blockNode.tagName.toLowerCase()))) {
                    blockNode = blockNode.parentNode;
                }

                if (blockNode && blockNode !== editor.editableArea) {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    pre.appendChild(code);

                    pre.setAttribute('dir', 'ltr');
                    pre.style.textAlign = 'left';
                    pre.style.whiteSpace = 'pre-wrap';
                    pre.style.fontFamily = 'Consolas, Monaco, "Andale Mono", monospace';
                    pre.style.backgroundColor = '#1e1e1e';
                    pre.style.color = '#d4d4d4';
                    pre.style.padding = '1em';
                    pre.style.borderRadius = '5px';
                    pre.style.overflowX = 'auto';
                    pre.style.minHeight = '60px';

                    code.setAttribute('dir', 'ltr');
                    code.style.display = 'block';
                    code.style.fontFamily = 'inherit';
                    code.style.minHeight = '28px';
                    code.className = 'code-block lang-javascript'; code.setAttribute('data-language', 'javascript');
                    code.style.color = '#abb2bf';

                    code.textContent = blockNode.textContent || '';
                    blockNode.parentNode.replaceChild(pre, blockNode);

                    // Run initial highlight
                    code.innerHTML = highlight(code.textContent, code.getAttribute('data-language') || 'javascript');
                    if (!code.innerHTML.endsWith('<br data-penman-ui="true">') && !code.innerHTML.endsWith('<br>')) {
                        code.insertAdjacentHTML('beforeend', '<br data-penman-ui="true">');
                    }

                    // Set selection to end
                    const newSel = window.getSelection();
                    newSel.removeAllRanges();
                    const newRange = document.createRange();
                    newRange.selectNodeContents(code);
                    newRange.collapse(false);
                    newSel.addRange(newRange);
                }
                if (editor.history) editor.history.pushImmediate();
            }
        }
    });

    // Real-time highlight hook
    editor.editableArea.addEventListener('input', (e) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.getRangeAt(0).startContainer;
        let preNode = null;
        
        while (node && node !== editor.editableArea) {
            if (node.tagName && node.tagName.toLowerCase() === 'pre') {
                preNode = node;
                break;
            }
            node = node.parentNode;
        }

        if (preNode) {
            healAndPatch(preNode);
        }
    });

    // Keyboard hooks for IDE-like behavior
    editor.editableArea.addEventListener('keydown', (e) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.getRangeAt(0).startContainer;
        let preNode = null;
        let codeNode = null;
        while (node && node !== editor.editableArea) {
            if (node.tagName && node.tagName.toLowerCase() === 'pre') {
                preNode = node;
                codeNode = preNode.querySelector('code');
                break;
            }
            node = node.parentNode;
        }

        if (preNode && codeNode) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                const offset = getCursorOffset(codeNode);
                const text = codeNode.textContent || '';
                const textLen = text.length;
                
                if (sel.isCollapsed && textLen === 0) {
                    // If empty, convert back to paragraph
                    e.preventDefault();
                    editor.execCommand('INSERT_CODEBLOCK');
                    return;
                }

                if ((e.key === 'Backspace' && offset === 0 && sel.isCollapsed) || 
                    (e.key === 'Delete' && offset === textLen && sel.isCollapsed)) {
                    // Prevent unwrapping/merging behavior at edges for non-empty blocks
                    e.preventDefault();
                    return;
                }
            }

            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();

                const range = sel.getRangeAt(0);
                
                // Get line before caret for auto-indent
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(codeNode);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                const lines = preCaretRange.toString().split('\n');
                const lastLine = lines[lines.length - 1];
                const match = lastLine.match(/^(\s*)/);
                const indent = match ? match[1] : '';

                const textNode = document.createTextNode('\n' + indent);
                range.deleteContents();
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                // Re-highlight using self-healing to catch edge-inserts
                healAndPatch(preNode);

                if (editor.history) editor.history.pushImmediate();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();

                const range = sel.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode('  '); // 2 spaces
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                // Re-highlight using self-healing
                healAndPatch(preNode);

                if (editor.history) editor.history.pushImmediate();
            }
        }
    }, true);

    // Paste hook for raw text only
    editor.editableArea.addEventListener('paste', (e) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.getRangeAt(0).startContainer;
        let preNode = null;
        let codeNode = null;
        while (node && node !== editor.editableArea) {
            if (node.tagName && node.tagName.toLowerCase() === 'pre') {
                preNode = node;
                codeNode = preNode.querySelector('code');
                break;
            }
            node = node.parentNode;
        }

        if (preNode && codeNode) {
            e.preventDefault();
            e.stopPropagation();

            const clipboardData = (e.originalEvent || e).clipboardData;
            let text = clipboardData.getData('text/plain');

            if (text) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                // Use self-healing patch to catch text pasted into <pre> boundaries
                healAndPatch(preNode);

                if (editor.history) editor.history.pushImmediate();
            }
        }
    }, true);
}

export { getCursorOffset, setCursorOffset };
