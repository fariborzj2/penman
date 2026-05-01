// src/plugins/CodeBlockPlugin/CodeBlockPlugin.js

/**
 * Native Regex-based tokenizer for JavaScript
 * Designed for extreme performance and absolute string preservation.
 */
function tokenizeJavaScript(text) {
    if (!text) return [];

    const tokens = [];
    let lastIndex = 0;

    // A single master regex to match all JS token types we care about
    // Capture groups:
    // 1: Block Comment (/* ... */)
    // 2: Line Comment (// ...)
    // 3: Template Literal (`...`)
    // 4: Double Quote String ("...")
    // 5: Single Quote String ('...')
    // 6: Number (integers and floats)
    // 7: Keyword
    const regex = /(\/\*[\s\S]*?\*\/)|(\/\/.*)|(`[^`]*`)|("([^"\\]|\\.)*")|('([^'\\]|\\.)*')|\b(\d+(\.\d+)?)\b|\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|super|switch|static|this|throw|true|try|typeof|var|void|while|with|yield)\b/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        // If there is plain text before the match, push it as a text token
        if (match.index > lastIndex) {
            tokens.push({ type: 'text', value: text.substring(lastIndex, match.index) });
        }

        if (match[1]) {
            tokens.push({ type: 'comment', value: match[1] });
        } else if (match[2]) {
            tokens.push({ type: 'comment', value: match[2] });
        } else if (match[3] !== undefined || match[4] !== undefined || match[6] !== undefined) {
            tokens.push({ type: 'string', value: match[0] });
        } else if (match[8] !== undefined) {
            tokens.push({ type: 'number', value: match[0] });
        } else if (match[10] !== undefined) {
            tokens.push({ type: 'keyword', value: match[0] });
        }

        lastIndex = regex.lastIndex;
    }

    // Push any remaining text
    if (lastIndex < text.length) {
        tokens.push({ type: 'text', value: text.substring(lastIndex) });
    }

    // Merge adjacent text tokens (just in case, though regex structure usually prevents this)
    const mergedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
        const current = tokens[i];
        if (mergedTokens.length > 0 && mergedTokens[mergedTokens.length - 1].type === 'text' && current.type === 'text') {
            mergedTokens[mergedTokens.length - 1].value += current.value;
        } else {
            mergedTokens.push(current);
        }
    }

    return mergedTokens;
}

/**
 * Incrementally patches the DOM nodes of the code element to match the tokens.
 * Limits mutations strictly to what has changed.
 */
function patchDOM(codeNode, tokens) {
    let childNode = codeNode.firstChild;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'text') {
            if (childNode && childNode.nodeType === 3) {
                // It's a text node, check content
                if (childNode.nodeValue !== token.value) {
                    childNode.nodeValue = token.value;
                }
                childNode = childNode.nextSibling;
            } else {
                // Either no node or wrong node type, insert new text node
                const newTextNode = document.createTextNode(token.value);
                if (childNode) {
                    codeNode.insertBefore(newTextNode, childNode);
                } else {
                    codeNode.appendChild(newTextNode);
                }
            }
        } else {
            // It's a token that requires a span
            const className = `penman-token-${token.type}`;
            
            if (childNode && childNode.nodeType === 1 && childNode.tagName === 'SPAN' && childNode.className === className) {
                // Correct span type, check content
                if (childNode.textContent !== token.value) {
                    childNode.textContent = token.value;
                }
                childNode = childNode.nextSibling;
            } else {
                // Wrong node type, insert new span
                const newSpan = document.createElement('span');
                newSpan.className = className;
                newSpan.textContent = token.value;
                
                if (childNode) {
                    codeNode.insertBefore(newSpan, childNode);
                } else {
                    codeNode.appendChild(newSpan);
                }
            }
        }
    }

    // Ensure a trailing propping <br> for browser rendering of empty lines
    let brNode = childNode;
    while (brNode && !(brNode.nodeType === 1 && brNode.tagName === 'BR' && brNode.getAttribute('data-penman-ui') === 'true')) {
        brNode = brNode.nextSibling;
    }

    if (brNode) {
        // Remove everything between the last processed token and the propping BR
        while (childNode && childNode !== brNode) {
            const next = childNode.nextSibling;
            codeNode.removeChild(childNode);
            childNode = next;
        }
        childNode = brNode.nextSibling;
    } else {
        const br = document.createElement('br');
        br.setAttribute('data-penman-ui', 'true');
        if (childNode) {
            codeNode.insertBefore(br, childNode);
        } else {
            codeNode.appendChild(br);
        }
    }

    // Remove any trailing nodes that are no longer needed
    while (childNode) {
        const next = childNode.nextSibling;
        codeNode.removeChild(childNode);
        childNode = next;
    }
}

/**
 * Calculates the absolute character offsets of the selection within the given code node.
 */
function getSelectionOffsets(codeNode) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { start: 0, end: 0, isBackwards: false };

    const range = sel.getRangeAt(0);
    const isBackwards = sel.anchorNode && (sel.anchorNode === range.endContainer && sel.anchorOffset === range.endOffset);
    
    const getOffset = (node, offset) => {
        if (!codeNode.contains(node) && node !== codeNode) return 0;
        const r = document.createRange();
        r.selectNodeContents(codeNode);
        try {
            r.setEnd(node, offset);
        } catch (e) {
            return 0;
        }
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(r.cloneContents());
        return tempDiv.textContent.length;
    };

    return {
        start: getOffset(range.startContainer, range.startOffset),
        end: getOffset(range.endContainer, range.endOffset),
        isBackwards
    };
}

/**
 * Calculates the absolute character offset of the cursor within the given code node.
 */
function getCursorOffset(codeNode) {
    return getSelectionOffsets(codeNode).end;
}

/**
 * Restores the selection range to specific absolute character offsets inside the code node.
 */
function setSelectionRange(codeNode, startOffset, endOffset, isBackwards = false) {
    if (startOffset < 0 || endOffset < 0) return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();

    let charCount = 0;
    let startFound = false;
    let endFound = false;

    const walker = document.createTreeWalker(codeNode, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
    let node;

    while ((node = walker.nextNode())) {
        if (node.nodeType === 3) {
            const nextCharCount = charCount + node.length;

            if (!startFound && startOffset >= charCount && startOffset <= nextCharCount) {
                range.setStart(node, startOffset - charCount);
                startFound = true;
                if (startOffset === nextCharCount && node.nodeValue.endsWith('\n') && node.nextSibling) {
                    range.setStartBefore(node.nextSibling);
                }
            }

            if (!endFound && endOffset >= charCount && endOffset <= nextCharCount) {
                range.setEnd(node, endOffset - charCount);
                endFound = true;
                if (endOffset === nextCharCount && node.nodeValue.endsWith('\n') && node.nextSibling) {
                    range.setEndBefore(node.nextSibling);
                }
            }

            if (startFound && endFound) break;
            charCount = nextCharCount;
        } else if (node.tagName === 'BR' && node.getAttribute('data-penman-ui') === 'true') {
            if (!startFound && startOffset === charCount) {
                range.setStartBefore(node);
                startFound = true;
            }
            if (!endFound && endOffset === charCount) {
                range.setEndBefore(node);
                endFound = true;
            }
            if (startFound && endFound) break;
        }
    }

    if (!startFound && startOffset === charCount) {
        const last = codeNode.lastChild;
        if (last && last.tagName === 'BR' && last.getAttribute('data-penman-ui') === 'true') {
            range.setStartBefore(last);
        } else {
            range.setStart(codeNode, codeNode.childNodes.length);
        }
        startFound = true;
    }
    if (!endFound && endOffset === charCount) {
        const last = codeNode.lastChild;
        if (last && last.tagName === 'BR' && last.getAttribute('data-penman-ui') === 'true') {
            range.setEndBefore(last);
        } else {
            range.setEnd(codeNode, codeNode.childNodes.length);
        }
        endFound = true;
    }

    sel.removeAllRanges();
    if (isBackwards && sel.setBaseAndExtent) {
        sel.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
    } else {
        sel.addRange(range);
    }
}

/**
 * Restores the cursor position to a specific absolute character offset inside the code node.
 */
function setCursorOffset(codeNode, offset) {
    setSelectionRange(codeNode, offset, offset);
}

function healAndPatch(preNode) {
    let codeNode = preNode.querySelector('code');
    if (!codeNode) {
        codeNode = document.createElement('code');
        codeNode.setAttribute('dir', 'ltr');
        codeNode.style.fontFamily = 'inherit';
        preNode.appendChild(codeNode);
    }

    // Heal any stray text inserted directly into <pre> (bypassing <code>)
    const offsets = getSelectionOffsets(codeNode);
    const rawText = preNode.textContent || '';

    // Remove everything else in the <pre> to maintain strict structure
    Array.from(preNode.childNodes).forEach(child => {
        if (child !== codeNode) {
            preNode.removeChild(child);
        }
    });

    // Re-highlight the <code> block with the full text
    const tokens = tokenizeJavaScript(rawText);
    patchDOM(codeNode, tokens);

    // Restore absolute selection relative to the code block now that everything is inside it
    setSelectionRange(codeNode, offsets.start, offsets.end, offsets.isBackwards);
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
                    code.style.color = 'rgb(43, 162, 129)';

                    code.textContent = blockNode.textContent || '';
                    blockNode.parentNode.replaceChild(pre, blockNode);

                    // Run initial highlight
                    const tokens = tokenizeJavaScript(code.textContent);
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

                const { start, end, isBackwards } = getSelectionOffsets(codeNode);
                const text = codeNode.textContent || '';

                if (!e.shiftKey && start === end) {
                    // Single-line Indent: Insert 2 spaces at cursor
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const textNode = document.createTextNode('  ');
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    healAndPatch(preNode);
                } else {
                    // Multi-line Indent or Outdent (or single-line outdent)
                    const lines = text.split('\n');
                    let currentPos = 0;
                    let newTextArr = [];
                    let adjustedStart = start;
                    let adjustedEnd = end;

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const lineStart = currentPos;
                        const lineEnd = currentPos + line.length;
                        // Selection touches this line if it overlaps with [lineStart, lineEnd]
                        const isSelected = (lineStart <= end && lineEnd >= start);

                        if (isSelected) {
                            if (e.shiftKey) {
                                const match = line.match(/^ {1,2}/);
                                if (match) {
                                    const removed = match[0].length;
                                    newTextArr.push(line.substring(removed));

                                    // Adjust offsets: if start/end are after the removed spaces, shift them back
                                    // If they are within the removed spaces, snap them to line start
                                    if (start >= lineStart) {
                                        adjustedStart -= Math.min(start - lineStart, removed);
                                    }
                                    if (end >= lineStart) {
                                        adjustedEnd -= Math.min(end - lineStart, removed);
                                    }
                                } else {
                                    newTextArr.push(line);
                                }
                            } else {
                                newTextArr.push('  ' + line);
                                // Adjust offsets: everything after the insertion shifts forward
                                if (start > lineStart || (start === lineStart && start === end)) {
                                     // For collapsed cursor at start of line, we usually want it to stay at start (moving with line)
                                     // but our logic above for start===end already handled collapsed cursor mid-line.
                                     // Actually if we are here, it's either not collapsed or we want line indent.
                                     adjustedStart += 2;
                                } else if (start === lineStart) {
                                     // Selection starts at beginning of line, keep it there
                                }

                                if (end >= lineStart) {
                                    adjustedEnd += 2;
                                }
                            }
                        } else {
                            newTextArr.push(line);
                        }

                        currentPos = lineEnd + 1; // +1 for \n
                    }

                    codeNode.textContent = newTextArr.join('\n');
                    setSelectionRange(codeNode, adjustedStart, adjustedEnd, isBackwards);
                    healAndPatch(preNode);
                }

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

export { tokenizeJavaScript, patchDOM, getCursorOffset, setCursorOffset };
