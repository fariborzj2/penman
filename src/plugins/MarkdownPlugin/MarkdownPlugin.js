export function setupMarkdownPlugin(editor) {
  editor.on('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      handleMarkdownExpansion(editor, e);
    }
  });

  editor.on('beforePaste', (pasteEvent) => {
    // Only intercept plain text paste, where text exists and html is empty or generic
    if (pasteEvent.text && !pasteEvent.html) {
      const html = parseMarkdownToHTML(pasteEvent.text);
      if (html !== pasteEvent.text) {
        pasteEvent.preventDefault();
        editor.insertContent(html);
      }
    }
  });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function parseMarkdownToHTML(text) {
  let lines = text.split('\n');
  let inList = false;
  let inOrderedList = false;
  let listHtml = '';
  let inTable = false;
  let tableHtml = '';
  let resultHtml = '';

  const flushList = () => {
    if (inList) {
      resultHtml += `<ul>${listHtml}</ul>`;
      inList = false;
      listHtml = '';
    }
    if (inOrderedList) {
      resultHtml += `<ol>${listHtml}</ol>`;
      inOrderedList = false;
      listHtml = '';
    }
  };

  const flushTable = () => {
    if (inTable) {
      const tableId = 't-' + Math.random().toString(36).substr(2, 9);
      resultHtml += `<table data-table-id="${tableId}" border="1" bordercolor="#ccc" style="width: 100%; border-collapse: collapse; border-style: solid;"><tbody>${tableHtml}</tbody></table>`;
      inTable = false;
      tableHtml = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Horizontal Rule
    if (/^---$/.test(line)) {
      flushList(); flushTable();
      resultHtml += '<hr>';
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList(); flushTable();
      const level = headingMatch[1].length;
      resultHtml += `<h${level}>${parseInlineMarkdown(headingMatch[2])}</h${level}>`;
      continue;
    }

    // Blockquotes
    const blockquoteMatch = line.match(/^>\s+(.*)$/);
    if (blockquoteMatch) {
      flushList(); flushTable();
      resultHtml += `<blockquote>${parseInlineMarkdown(blockquoteMatch[1])}</blockquote>`;
      continue;
    }

    // Unordered List
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushTable();
      if (inOrderedList) flushList();
      inList = true;
      listHtml += `<li>${parseInlineMarkdown(ulMatch[1])}</li>`;
      continue;
    }

    // Ordered List
    const olMatch = line.match(/^1\.\s+(.*)$/);
    if (olMatch) {
      flushTable();
      if (inList) flushList();
      inOrderedList = true;
      listHtml += `<li>${parseInlineMarkdown(olMatch[1])}</li>`;
      continue;
    }

    // Table
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      // Skip alignment rows e.g., |---|---|
      if (line.replace(/\|/g, '').replace(/-/g, '').replace(/:/g, '').replace(/\s/g, '').length === 0) {
        continue;
      }
      inTable = true;
      const cells = line.split('|').slice(1, -1);
      let rowHtml = '<tr>';
      for (const cell of cells) {
        const cellId = 'c-' + Math.random().toString(36).substr(2, 9);
        rowHtml += `<td data-cell-id="${cellId}" style="border-width: 1px; border-style: solid; border-color: #ccc; padding: 5px;"><p>${parseInlineMarkdown(cell.trim())}</p></td>`;
      }
      rowHtml += '</tr>';
      tableHtml += rowHtml;
      continue;
    }

    flushList(); flushTable();

    // Paragraph
    if (line.length > 0) {
      resultHtml += `<p>${parseInlineMarkdown(line)}</p>`;
    } else {
      // Empty line could mean paragraph break
      resultHtml += `<p><br></p>`;
    }
  }

  flushList(); flushTable();

  // If the parsed HTML is just paragraphs without any markdown transformation
  // (e.g. no tags other than p/br and plain text), then it wasn't really markdown.
  // We check if it changed at all. Wait, if it just wraps in <p>, that's what Editor.js does anyway.
  // Actually, Editor.js split by \n and wraps in <p>.
  // Let's ensure if there was NO markdown applied, we return the original text so Editor.js can handle it,
  // to avoid interfering with normal pastes unnecessarily.
  // Alternatively, just returning resultHtml is fine, it effectively normalizes the paste to <p>.
  // But let's check if the text had ANY markdown matches.
  // If it didn't match any block or inline rules, return original.
  const hasMarkdown = /#{1,6}\s|>\s|[-*]\s|1\.\s|---|\*\*|__|\*|_|~~|\|.*\|/.test(text);
  if (!hasMarkdown) {
      return text;
  }

  return resultHtml;
}

function parseInlineMarkdown(text) {
  let safeText = escapeHtml(text);

  // Bold
  safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safeText = safeText.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  safeText = safeText.replace(/_(.*?)_/g, '<em>$1</em>');

  // Strikethrough
  safeText = safeText.replace(/~~(.*?)~~/g, '<del>$1</del>');

  return safeText;
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

  // Dynamic check for GFM table syntax: `| Cell 1 | Cell 2 |` -> space -> table
  // This looks for at least 2 pipes separated by characters, indicating a table row
  const tableRegex = /^\|.*\|.*\| $/;
  const tableMatch = textBeforeCursor.match(tableRegex);

  if (tableMatch) {
      editor.history.takeSnapshot();
      textNode.textContent = textNode.textContent.slice(offset);

      const selection = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(textNode, 0);
      newRange.setEnd(textNode, 0);
      selection.removeAllRanges();
      selection.addRange(newRange);

      const cols = (tableMatch[0].match(/\|/g) || []).length - 1;
      editor.execCommand('INSERT_TABLE', { rows: 2, cols: cols > 0 ? cols : 2 });

      return true;
  }

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
