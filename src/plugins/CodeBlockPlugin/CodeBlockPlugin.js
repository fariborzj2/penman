import hljs from 'highlight.js';

export function setupCodeBlockPlugin(editor) {
  const languages = [
    { label: 'Auto-detect', value: 'auto' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'PHP', value: 'php' },
    { label: 'HTML', value: 'xml' },
    { label: 'CSS', value: 'css' },
    { label: 'JSON', value: 'json' },
    { label: 'Bash', value: 'bash' },
    { label: 'SQL', value: 'sql' },
    { label: 'Python', value: 'python' }
  ];

  editor.ui.registry.addButton('codeblock', {
    iconName: 'codeblock',
    text: editor.i18n.t('plugins.codeBlock.title') || 'Code Block',
    onAction: () => {
      editor.execCommand('INSERT_CODEBLOCK');
    }
  });

  // Track active state and show language badge
  editor.on('selectionChange', () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
        hideFloatingBadge();
        return;
    }

    let node = sel.getRangeAt(0).startContainer;
    let inCodeBlock = false;
    let codeNode = null;
    while (node && node !== editor.editableArea) {
      if (node.tagName && node.tagName.toLowerCase() === 'code') {
        inCodeBlock = true;
        codeNode = node;
        break;
      }
      node = node.parentNode;
    }

    const btn = editor.container.querySelector('.penman-btn-codeblock');
    if (btn) {
      if (inCodeBlock) {
        btn.classList.add('penman-btn-active');
        showFloatingBadge(codeNode);
      } else {
        btn.classList.remove('penman-btn-active');
        hideFloatingBadge();
      }
    }
  });

  let badge = null;
  function showFloatingBadge(codeNode) {
      const preNode = codeNode.parentNode;
      if (!preNode || preNode.tagName.toLowerCase() !== 'pre') return;

      if (!badge) {
          badge = document.createElement('div');
          badge.className = 'penman-code-badge';
          badge.setAttribute('data-penman-ui', 'true');
          badge.contentEditable = 'false';
          badge.style.position = 'absolute';
          badge.style.zIndex = '10';
          badge.style.background = 'rgba(60, 60, 60, 0.8)';
          badge.style.color = '#ccc';
          badge.style.padding = '2px 8px';
          badge.style.fontSize = '10px';
          badge.style.borderRadius = '3px';
          badge.style.cursor = 'pointer';
          badge.style.userSelect = 'none';
          badge.style.fontFamily = 'sans-serif';
          badge.style.top = '5px';
          badge.style.right = '5px';

          badge.addEventListener('mousedown', (e) => e.preventDefault());
          badge.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              showLanguageSelector(codeNode);
          });
      }

      const currentLang = codeNode.getAttribute('data-language') || 'auto';
      const langLabel = languages.find(l => l.value === currentLang)?.label || 'Auto';
      badge.innerText = langLabel;

      if (badge.parentNode !== preNode) {
          preNode.appendChild(badge);
      }
      badge.style.display = 'block';
  }

  function hideFloatingBadge() {
      if (badge && badge.parentNode) {
          badge.parentNode.removeChild(badge);
          badge = null;
      }
  }

  function showLanguageSelector(codeNode) {
      const menu = document.createElement('div');
      menu.className = 'penman-code-lang-menu';
      menu.style.position = 'fixed';
      menu.style.zIndex = '10001';
      menu.style.background = '#fff';
      menu.style.border = '1px solid #ccc';
      menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
      menu.style.borderRadius = '4px';
      menu.style.padding = '5px 0';
      menu.style.minWidth = '120px';

      languages.forEach(lang => {
          const item = document.createElement('div');
          item.innerText = lang.label;
          item.style.padding = '5px 15px';
          item.style.cursor = 'pointer';
          item.style.fontSize = '13px';
          item.style.color = '#333';

          item.onmouseover = () => item.style.background = '#f0f0f0';
          item.onmouseout = () => item.style.background = 'transparent';

          item.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              codeNode.setAttribute('data-language', lang.value);
              const offset = getCaretCharacterOffsetWithin(codeNode);
              highlightBlock(codeNode);
              setCurrentCursorPosition(codeNode, offset);
              showFloatingBadge(codeNode);
              menu.remove();
              if (editor.history) editor.history.pushImmediate();
          };
          menu.appendChild(item);
      });

      const badgeRect = badge.getBoundingClientRect();
      document.body.appendChild(menu);
      menu.style.left = badgeRect.left + 'px';
      menu.style.top = badgeRect.bottom + 2 + 'px';

      const closeHandler = (e) => {
          if (!menu.contains(e.target) && e.target !== badge) {
              menu.remove();
              document.removeEventListener('mousedown', closeHandler, true);
          }
      };
      document.addEventListener('mousedown', closeHandler, true);
  }

  editor.commands.register('INSERT_CODEBLOCK', {
    execute: (editor, langValue = 'auto') => {
      if (langValue === null) langValue = 'auto';
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      let node = sel.getRangeAt(0).startContainer;
      let inCodeBlock = false;
      let codeNode = null;
      while (node && node !== editor.editableArea) {
        if (node.tagName && node.tagName.toLowerCase() === 'code') {
          inCodeBlock = true;
          codeNode = node;
          break;
        }
        node = node.parentNode;
      }

      if (inCodeBlock) {
        // Exit code block by converting pre to p
        let preNode = codeNode.parentNode;
        if (preNode && preNode.tagName.toLowerCase() === 'pre') {
          const p = document.createElement('p');
          const text = codeNode.innerText || codeNode.textContent || '';

          // Securely handle text content to avoid XSS when converting to HTML
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

          // restore selection
          const newSel = window.getSelection();
          newSel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false);
          newSel.addRange(newRange);
        }
        if (editor.history) editor.history.pushImmediate();
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
          pre.style.fontFamily = 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace';
          pre.style.backgroundColor = '#1e1e1e';
          pre.style.color = '#d4d4d4';
          pre.style.padding = '1em';
          pre.style.borderRadius = '5px';
          pre.style.overflowX = 'auto';
          pre.style.position = 'relative';

          code.setAttribute('dir', 'ltr');
          code.style.fontFamily = 'inherit';
          code.setAttribute('data-language', langValue);

          code.textContent = blockNode.innerText || blockNode.textContent || '';

          blockNode.parentNode.replaceChild(pre, blockNode);

          // Highlight
          highlightBlock(code);

          // Restore selection inside code
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

  function highlightBlock(codeNode) {
    // textContent is safer and more consistent than innerText for code blocks
    let text = codeNode.textContent || '';
    let lang = codeNode.getAttribute('data-language');

    if (lang === 'null' || lang === 'undefined') lang = 'auto';

    let result;
    if (lang && lang !== 'auto' && hljs.getLanguage(lang)) {
        try {
            result = hljs.highlight(text, { language: lang });
        } catch (e) {
            result = hljs.highlightAuto(text);
        }
    } else {
        result = hljs.highlightAuto(text);
    }

    // Using innerHTML with result.value is fine, but we must be careful with trailing newlines.
    // highlight.js already escapes HTML.
    // Browsers often ignore a single trailing \n in a block element.
    // If the text ends with \n, we need to ensure it's rendered.
    // Adding ONE \n is enough if the content doesn't already have one that the browser sees.
    // However, if we add it on every re-highlight, it grows.

    // Solution: highlight.js output doesn't include the trailing \n if we didn't give it one that it considers part of a "token".
    // We only add a trailing \n if the ACTUAL text ends with a newline, to "prop" the last empty line.
    let htmlValue = result.value;

    // If the text ends with a newline, browsers (Chrome/Firefox) typically need TWO newlines
    // at the end of innerHTML to show ONE empty line at the bottom.
    // But since result.value might already have the first one escaped or handled,
    // we only add what's missing.
    if (text.endsWith('\n')) {
        // Only append if result.value doesn't already end with a newline character
        if (!htmlValue.endsWith('\n')) {
            htmlValue += '\n';
        }
    }

    codeNode.innerHTML = htmlValue;
  }

  // Debounced auto-highlight
  let highlightTimeout;
  editor.editableArea.addEventListener('input', (e) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.getRangeAt(0).startContainer;
    let codeNode = null;
    while (node && node !== editor.editableArea) {
      if (node.tagName && node.tagName.toLowerCase() === 'code') {
        codeNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (codeNode) {
      clearTimeout(highlightTimeout);
      highlightTimeout = setTimeout(() => {
        const offset = getCaretCharacterOffsetWithin(codeNode);
        highlightBlock(codeNode);
        setCurrentCursorPosition(codeNode, offset);
      }, 500);
    }
  });

  function getCaretCharacterOffsetWithin(element) {
    let caretOffset = 0;
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const sel = win.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      // Use textContent instead of toString for consistent offset calculation
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(preCaretRange.cloneContents());
      caretOffset = tempDiv.textContent.length;
    }
    return caretOffset;
  }

  function setCurrentCursorPosition(element, offset) {
    if (offset < 0) return;
    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let nodeStack = [element];
    let node;
    let found = false;
    let lastNode = null;

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
        lastNode = node;
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    // Edge case: offset is at the very end of the last text node
    if (!found && lastNode && charCount === offset) {
        range.setStart(lastNode, lastNode.length);
        range.collapse(true);
        found = true;
    }

    if (found) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // Intercept keydown inside codeblock
  editor.editableArea.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.getRangeAt(0).startContainer;
    let inCodeBlock = false;
    let codeNode = null;
    while (node && node !== editor.editableArea) {
      if (node.tagName && node.tagName.toLowerCase() === 'code') {
        inCodeBlock = true;
        codeNode = node;
        break;
      }
      if (node.tagName && node.tagName.toLowerCase() === 'pre') {
          inCodeBlock = true;
          codeNode = node.querySelector('code');
          break;
      }
      node = node.parentNode;
    }

    if (inCodeBlock && codeNode) {
      if (e.key === 'Backspace') {
        const offset = getCaretCharacterOffsetWithin(codeNode);
        if (offset === 0 && sel.isCollapsed) {
          // Prevent browser from merging code block into previous block or unwrapping it
          e.preventDefault();
          return;
        }
      } else if (e.key === 'Delete') {
        const offset = getCaretCharacterOffsetWithin(codeNode);
        const textLen = (codeNode.textContent || '').length;
        if (offset === textLen && sel.isCollapsed) {
          // Prevent browser from merging the next block into the code block
          e.preventDefault();
          return;
        }
      }

      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        const range = sel.getRangeAt(0);

        // Auto-indent: get leading whitespace of current line
        const textBeforeCaret = getLineBeforeCaret(codeNode, range);
        const match = textBeforeCaret.match(/^(\s*)/);
        const indent = match ? match[1] : '';

        const textNode = document.createTextNode('\n' + indent);
        range.deleteContents();
        range.insertNode(textNode);
        
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        if (editor.history) {
          editor.history.pushImmediate();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode('  ');
        range.insertNode(textNode);

        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        if (editor.history) {
          editor.history.pushImmediate();
        }
      }
    }
  }, true);

  function getLineBeforeCaret(element, range) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const text = preCaretRange.toString();
      const lines = text.split('\n');
      return lines[lines.length - 1];
  }

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
        codeNode = node.tagName.toLowerCase() === 'code' ? node : node.querySelector('code');
        break;
      }
      node = node.parentNode;
    }

    if (inCodeBlock && codeNode) {
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

        // Immediate highlight
        const offset = getCaretCharacterOffsetWithin(codeNode);
        highlightBlock(codeNode);
        setCurrentCursorPosition(codeNode, offset);

        if (editor.history) {
          editor.history.pushImmediate();
        }
      }
    }
  }, true);
}
