// src/plugins/CodeBlockPlugin/CodeBlockPlugin.js

/**
 * Native Regex-based tokenizer for JavaScript
 * Designed for extreme performance and absolute string preservation.
 */
import { getTokens } from './syntax/index.js';

// Inject syntax styles
const styleId = 'penman-syntax-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .penman-token-keyword { color: #c678dd; }
        .penman-token-string { color: #98c379; }
        .penman-token-comment { color: #5c6370; font-style: italic; }
        .penman-token-number { color: #d19a66; }
        .penman-token-operator { color: #56b6c2; }
        .penman-token-punctuation { color: #abb2bf; }
        pre {
            background-color: #282c34 !important;
            overflow-x: auto !important;
        }
    `;
    document.head.appendChild(style);
}

function extractTextWithNewlines(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'br') return '\n';
    let text = '';
    for (let child of node.childNodes) {
        text += extractTextWithNewlines(child);
    }
    return text;
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
    
    // We will use a TreeWalker to find the text node because it is cleaner for sequential text accumulation
    const walker = document.createTreeWalker(codeNode, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let found = false;
    let lastTextNode = null;

    while ((node = walker.nextNode())) {
        lastTextNode = node;
        const length = node.nodeValue.length;
        if (offset <= charCount + length) {
            // Found the node containing the offset
            range.setStart(node, offset - charCount);
            range.collapse(true);
            found = true;
            break;
        }
        charCount += length;
    }

    // Edge case: offset is at the very end of the text content
    if (!found && lastTextNode && charCount === offset) {
        range.setStart(lastTextNode, lastTextNode.nodeValue.length);
        range.collapse(true);
        found = true;
    }

    // Ensure cursor visibility on trailing new lines
    if (found) {
        const textToCursor = codeNode.textContent.substring(0, offset);
        if (textToCursor.endsWith('\n')) {
            // Look for the trailing BR to position caret before it
            const brs = codeNode.querySelectorAll('br[data-penman-ui="true"]');
            const br = brs[brs.length - 1];
            if (br && offset === codeNode.textContent.length) {
                range.setStartBefore(br);
                range.collapse(true);
            }
        }
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function patchDOM(codeNode, tokens) {
    let childNodes = Array.from(codeNode.childNodes);
    // Remove the trailing BR temporarily to make diffing simpler
    let trailingBR = null;
    if (childNodes.length > 0) {
        const last = childNodes[childNodes.length - 1];
        if (last.nodeName.toLowerCase() === 'br' && last.getAttribute('data-penman-ui') === 'true') {
            trailingBR = last;
            codeNode.removeChild(trailingBR);
            childNodes.pop();
        }
    }

    let nodeIndex = 0;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let existingNode = childNodes[nodeIndex];

        if (token.type === 'plain') {
            if (existingNode && existingNode.nodeType === Node.TEXT_NODE) {
                if (existingNode.nodeValue !== token.value) {
                    existingNode.nodeValue = token.value;
                }
                nodeIndex++;
            } else {
                const textNode = document.createTextNode(token.value);
                if (existingNode) {
                    codeNode.insertBefore(textNode, existingNode);
                } else {
                    codeNode.appendChild(textNode);
                }
            }
        } else {
            const className = `penman-token-${token.type}`;
            if (existingNode && existingNode.nodeType === Node.ELEMENT_NODE && existingNode.tagName.toLowerCase() === 'span' && existingNode.className === className) {
                if (existingNode.textContent !== token.value) {
                    existingNode.textContent = token.value;
                }
                nodeIndex++;
            } else {
                const span = document.createElement('span');
                span.className = className;
                span.textContent = token.value;
                if (existingNode) {
                    codeNode.insertBefore(span, existingNode);
                } else {
                    codeNode.appendChild(span);
                }
            }
        }
    }

    // Remove any remaining extra nodes
    while (nodeIndex < childNodes.length) {
        codeNode.removeChild(childNodes[nodeIndex]);
        nodeIndex++;
    }

    // Restore or create trailing BR
    if (!trailingBR) {
        trailingBR = document.createElement('br');
        trailingBR.setAttribute('data-penman-ui', 'true');
    }
    codeNode.appendChild(trailingBR);
}

function getSelectionOffsets(codeNode) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { start: 0, end: 0 };

    const range = sel.getRangeAt(0);
    
    const startRange = range.cloneRange();
    startRange.selectNodeContents(codeNode);
    startRange.setEnd(range.startContainer, range.startOffset);
    const startDiv = document.createElement('div');
    startDiv.appendChild(startRange.cloneContents());
    const start = startDiv.textContent.length;

    const endRange = range.cloneRange();
    endRange.selectNodeContents(codeNode);
    endRange.setEnd(range.endContainer, range.endOffset);
    const endDiv = document.createElement('div');
    endDiv.appendChild(endRange.cloneContents());
    const end = endDiv.textContent.length;

    return { start, end };
}

function setSelectionOffsets(codeNode, startOffset, endOffset) {
    if (startOffset < 0) startOffset = 0;
    if (endOffset < startOffset) endOffset = startOffset;
    
    const sel = window.getSelection();
    const range = document.createRange();
    
    const walker = document.createTreeWalker(codeNode, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let charCount = 0;
    let startFound = false;
    let endFound = false;
    let lastTextNode = null;

    while ((node = walker.nextNode())) {
        lastTextNode = node;
        const length = node.nodeValue.length;
        
        if (!startFound && startOffset <= charCount + length) {
            range.setStart(node, startOffset - charCount);
            startFound = true;
        }
        
        if (!endFound && endOffset <= charCount + length) {
            range.setEnd(node, endOffset - charCount);
            endFound = true;
            break;
        }
        
        charCount += length;
    }

    if (!startFound && lastTextNode) {
        range.setStart(lastTextNode, lastTextNode.nodeValue.length);
    }
    if (!endFound && lastTextNode) {
        range.setEnd(lastTextNode, lastTextNode.nodeValue.length);
    }

    // Ensure cursor visibility on trailing new lines if collapsed
    if (startOffset === endOffset && startFound) {
        const textToCursor = codeNode.textContent.substring(0, startOffset);
        if (textToCursor.endsWith('\n')) {
            const brs = codeNode.querySelectorAll('br[data-penman-ui="true"]');
            const br = brs[brs.length - 1];
            if (br && startOffset === codeNode.textContent.length) {
                range.setStartBefore(br);
                range.collapse(true);
            }
        }
    }

    sel.removeAllRanges();
    sel.addRange(range);
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

    // Re-highlight the <code> block with the full text using Incremental DOM Patching
    const tokens = getTokens(rawText, codeNode.getAttribute('data-language') || 'javascript');
    patchDOM(codeNode, tokens);

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

                    code.textContent = extractTextWithNewlines(blockNode) || '';
                    blockNode.parentNode.replaceChild(pre, blockNode);

                    // Run initial highlight
                    const tokens = getTokens(code.textContent, code.getAttribute('data-language') || 'javascript');
                    patchDOM(code, tokens);

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

                const { start, end } = getSelectionOffsets(codeNode);
                let text = codeNode.textContent || '';
                
                // Find line start indices
                let lineStart = text.lastIndexOf('\n', start - 1) + 1;
                let lineEnd = text.indexOf('\n', end);
                if (lineEnd === -1) lineEnd = text.length;

                // Extract the selected lines block
                let selectedBlock = text.substring(lineStart, lineEnd);
                let lines = selectedBlock.split('\n');
                
                let newStart = start;
                let newEnd = end;

                if (e.shiftKey) {
                    // Outdent
                    for (let i = 0; i < lines.length; i++) {
                        let line = lines[i];
                        let spacesToRemove = 0;
                        if (line.startsWith('  ')) spacesToRemove = 2;
                        else if (line.startsWith(' ')) spacesToRemove = 1;
                        
                        if (spacesToRemove > 0) {
                            lines[i] = line.substring(spacesToRemove);
                            if (i === 0) newStart = Math.max(lineStart, newStart - spacesToRemove);
                            newEnd -= spacesToRemove;
                        }
                    }
                } else {
                    // Indent
                    if (start === end && lines.length === 1 && false) {
                        // Let normal replace behavior handle simple collapsed tabs if we wanted, 
                        // but the user wants normal indent for lines. If no text is selected, just indent the line!
                        // Actually, many IDEs indent the whole line or just insert spaces at caret if collapsed.
                        // For simplicity, let's insert spaces at caret if collapsed, OR indent the whole line?
                        // Let's indent the whole line to match the multi-line behavior.
                        // WAIT: If collapsed, users often expect Tab to insert spaces at the cursor, not at the beginning of the line.
                    }
                    
                    if (start === end) {
                        // Simple insertion at cursor
                        text = text.substring(0, start) + '  ' + text.substring(start);
                        newStart += 2;
                        newEnd += 2;
                        
                        // We must reconstruct the full text and highlight it
                        const tokens = getTokens(text, codeNode.getAttribute('data-language') || 'javascript');
                        patchDOM(codeNode, tokens);
                        setSelectionOffsets(codeNode, newStart, newEnd);
                        if (editor.history) editor.history.pushImmediate();
                        return;
                    } else {
                        // Multi-line indent
                        for (let i = 0; i < lines.length; i++) {
                            lines[i] = '  ' + lines[i];
                            if (i === 0) newStart += 2;
                            newEnd += 2;
                        }
                    }
                }

                if (start !== end || e.shiftKey) {
                    let newBlock = lines.join('\n');
                    text = text.substring(0, lineStart) + newBlock + text.substring(lineEnd);
                    
                    const tokens = getTokens(text, codeNode.getAttribute('data-language') || 'javascript');
                    patchDOM(codeNode, tokens);
                    
                    setSelectionOffsets(codeNode, newStart, newEnd);
                    if (editor.history) editor.history.pushImmediate();
                }
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
                // Normalize CRLF to LF to avoid issues with newlines getting squished or rendering improperly
                text = text.replace(/\r\n/g, '\n');
                
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