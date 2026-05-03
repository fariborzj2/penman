export function setupMarkdownPlugin(editor) {
  editor.on('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      handleMarkdownExpansion(editor, e);
    }
  });
}

function handleMarkdownExpansion(editor, e) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;

  if (!editor.editableArea.contains(container)) return;

  let textNode = container.nodeType === Node.TEXT_NODE ? container : null;

  if (textNode) {
    const textContent = textNode.textContent;
    const offset = range.startOffset;

    const textBeforeCursor = textContent.slice(0, offset);

    if (e.key === ' ' && tryBlockMatch(editor, textNode, textBeforeCursor, offset)) {
      e.preventDefault();
      return;
    }

    if (tryInlineMatch(editor, textNode, textBeforeCursor, offset)) {
      return;
    }
  } else if (container.nodeType === Node.ELEMENT_NODE) {
  }
}

function tryBlockMatch(editor, textNode, textBeforeCursor, offset) {
  const blockPatterns = [
    { regex: /^# $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'h1' } },
    { regex: /^## $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'h2' } },
    { regex: /^### $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'h3' } },
    { regex: /^#### $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'h4' } },
    { regex: /^##### $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'h5' } },
    { regex: /^###### $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'h6' } },
    { regex: /^> $/, cmd: 'SET_BLOCK_TYPE', value: { cmd: 'blockquote' } },
    { regex: /^[-*] $/, cmd: 'insertUnorderedList' },
    { regex: /^1\. $/, cmd: 'insertOrderedList' },
    { regex: /^--- $/, cmd: 'INSERT_HORIZONTAL_RULE' },
    { regex: /^---$/, cmd: 'INSERT_HORIZONTAL_RULE' }
  ];

  for (let pattern of blockPatterns) {
    if (pattern.regex.test(textBeforeCursor)) {
      editor.history.takeSnapshot();

      textNode.textContent = textNode.textContent.slice(offset);

      const selection = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(textNode, 0);
      newRange.setEnd(textNode, 0);
      selection.removeAllRanges();
      selection.addRange(newRange);

      if (pattern.value) {
        editor.execCommand(pattern.cmd, pattern.value);
      } else {
        editor.execCommand(pattern.cmd);
      }

      return true;
    }
  }
  return false;
}

function tryInlineMatch(editor, textNode, textBeforeCursor, offset) {
  // The regex now optionally matches a trailing space, since the space is inserted before keyup
  const inlinePatterns = [
    { regex: /\*\*(.+?)\*\*(\s?)$/, tag: 'strong' },
    { regex: /__(.+?)__(\s?)$/, tag: 'strong' },
    { regex: /\*(.+?)\*(\s?)$/, tag: 'em' },
    { regex: /_(.+?)_(\s?)$/, tag: 'em' },
    { regex: /~~(.+?)~~(\s?)$/, tag: 'del' }
  ];

  for (let pattern of inlinePatterns) {
    const match = textBeforeCursor.match(pattern.regex);
    if (match) {
      editor.history.takeSnapshot();

      const innerText = match[1];
      const trailingSpace = match[2] || '';
      const matchIndex = match.index;

      const prefix = textNode.textContent.slice(0, matchIndex);
      const suffix = textNode.textContent.slice(offset);

      const wrapper = document.createElement(pattern.tag);
      wrapper.textContent = innerText;

      const parent = textNode.parentNode;

      const prefixNode = document.createTextNode(prefix);
      const suffixNode = document.createTextNode(suffix);

      parent.insertBefore(prefixNode, textNode);
      parent.insertBefore(wrapper, textNode);

      const spaceStr = trailingSpace ? trailingSpace : '\u200B';
      const spaceNode = document.createTextNode(spaceStr);
      parent.insertBefore(spaceNode, textNode);

      parent.insertBefore(suffixNode, textNode);
      parent.removeChild(textNode);

      const selection = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(spaceNode, spaceStr.length);
      newRange.setEnd(spaceNode, spaceStr.length);
      selection.removeAllRanges();
      selection.addRange(newRange);

      return true;
    }
  }
  return false;
}
