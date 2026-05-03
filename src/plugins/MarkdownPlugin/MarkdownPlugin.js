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
  let resultHtml = '';

  let listStack = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = [];
  let inTable = false;
  let tableRows = [];
  let tableAlignments = [];

  let inBlockquote = 0;
  let blockquoteContent = '';

  const flushList = () => {
    while (listStack.length > 0) {
      let top = listStack.pop();
      resultHtml += `</${top.type}>`;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const tableId = 't-' + Math.random().toString(36).substr(2, 9);
      resultHtml += `<table data-table-id="${tableId}" border="1" bordercolor="#ccc" style="width: 100%; border-collapse: collapse; border-style: solid;"><tbody>`;
      tableRows.forEach(row => {
        resultHtml += '<tr>';
        row.forEach((cell, idx) => {
          const cellId = 'c-' + Math.random().toString(36).substr(2, 9);
          const align = tableAlignments[idx] ? `text-align: ${tableAlignments[idx]}; ` : '';
          resultHtml += `<td data-cell-id="${cellId}" style="border-width: 1px; border-style: solid; border-color: #ccc; padding: 5px; ${align}"><p>${parseInlineMarkdown(cell.trim())}</p></td>`;
        });
        resultHtml += '</tr>';
      });
      resultHtml += `</tbody></table>`;
      inTable = false;
      tableRows = [];
      tableAlignments = [];
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote > 0) {
      // Recursive parsing for nested blockquotes would be ideal, but for zero-deps simplicity we wrap
      let bqHtml = parseMarkdownToHTML(blockquoteContent.trim());
      for (let j = 0; j < inBlockquote; j++) {
        bqHtml = `<blockquote>${bqHtml}</blockquote>`;
      }
      resultHtml += bqHtml;
      inBlockquote = 0;
      blockquoteContent = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i];
    let line = rawLine.trim();

    // HTML Blocks (Optional) - Just pass them through untouched if they look like HTML
    if (line.startsWith('<') && line.endsWith('>') && !line.includes('<http')) {
      flushList(); flushTable(); flushBlockquote();
      resultHtml += rawLine + '\n';
      continue;
    }

    // Code blocks (Fenced)
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        resultHtml += `<pre><code class="language-${codeBlockLang}" data-language="${codeBlockLang}">${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`;
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        flushList(); flushTable(); flushBlockquote();
        inCodeBlock = true;
        codeBlockLang = line.substring(3).trim() || 'javascript';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    // Code blocks (Indented by 4 spaces or 1 tab)
    if (rawLine.startsWith('    ') || rawLine.startsWith('\t')) {
       // Only if not inside a list (lists have indent too)
       if (listStack.length === 0) {
         flushList(); flushTable(); flushBlockquote();
         // If it's just an indented line, we treat it as code block if previous line was empty
         if (i > 0 && lines[i-1].trim() === '') {
            resultHtml += `<pre><code>${escapeHtml(rawLine.replace(/^(    |\t)/, ''))}</code></pre>`;
            continue;
         }
       }
    }

    // Blockquotes (detect > and count them for nested)
    const bqMatch = rawLine.match(/^(>[\s>]*)(.*)/);
    if (bqMatch) {
      flushList(); flushTable();
      let level = bqMatch[1].replace(/[^>]/g, '').length;
      if (inBlockquote === 0) {
        inBlockquote = level;
        blockquoteContent = bqMatch[2] + '\n';
      } else if (inBlockquote === level) {
        blockquoteContent += bqMatch[2] + '\n';
      } else {
        // level changed, flush and restart
        flushBlockquote();
        inBlockquote = level;
        blockquoteContent = bqMatch[2] + '\n';
      }
      continue;
    } else {
      flushBlockquote();
    }

    // Horizontal Rule
    if (/^[-*_]{3,}$/.test(line)) {
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

    // Admonition Blocks
    const admonitionMatch = line.match(/^\[!(TIP|NOTE|WARNING|INFO|DANGER)\](.*)$/i);
    if (admonitionMatch) {
      flushList(); flushTable();
      const type = admonitionMatch[1].toLowerCase();
      resultHtml += `<div class="penman-admonition penman-admonition-${type}"><strong>${type.toUpperCase()}:</strong> ${parseInlineMarkdown(admonitionMatch[2])}</div>`;
      continue;
    }

    // Lists (Nested, Checkbox)
    const listMatch = rawLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      flushTable();
      let indent = listMatch[1].length;
      let marker = listMatch[2];
      let type = marker.endsWith('.') ? 'ol' : 'ul';
      let content = listMatch[3];

      // Check for Task List [ ] or [x]
      let isTask = false;
      let isChecked = false;
      const taskMatch = content.match(/^\[([ xX])\]\s+(.*)/);
      if (taskMatch) {
        isTask = true;
        isChecked = taskMatch[1].toLowerCase() === 'x';
        content = taskMatch[2];
      }

      let liHtml = `<li>`;
      if (isTask) {
        liHtml += `<input type="checkbox" disabled ${isChecked ? 'checked' : ''}> `;
      }
      liHtml += `${parseInlineMarkdown(content)}</li>`;

      if (listStack.length === 0) {
        listStack.push({ type, indent });
        resultHtml += `<${type}>${liHtml}`;
      } else {
        let top = listStack[listStack.length - 1];
        if (indent > top.indent) {
          listStack.push({ type, indent });
          resultHtml += `<${type}>${liHtml}`;
        } else if (indent < top.indent) {
          while (listStack.length > 0 && listStack[listStack.length - 1].indent > indent) {
            let popped = listStack.pop();
            resultHtml += `</${popped.type}>`;
          }
          if (listStack.length === 0) {
            listStack.push({ type, indent });
            resultHtml += `<${type}>${liHtml}`;
          } else {
            resultHtml += liHtml;
          }
        } else {
          if (top.type !== type) {
            resultHtml += `</${top.type}><${type}>`;
            top.type = type;
          }
          resultHtml += liHtml;
        }
      }
      continue;
    } else if (listStack.length > 0 && line !== '') {
      // Lazy continuation of list item (soft break)
      resultHtml += `<br>${parseInlineMarkdown(line)}`;
      continue;
    } else if (line === '') {
       // empty line breaks list
       flushList();
    }

    // Table
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();

      const cells = line.split('|').slice(1, -1);

      // Check if it's an alignment row e.g., |:---|---:|
      const isAlignRow = cells.every(c => /^[:\-\s]+$/.test(c) && c.includes('-'));
      if (isAlignRow) {
         tableAlignments = cells.map(c => {
             c = c.trim();
             if (c.startsWith(':') && c.endsWith(':')) return 'center';
             if (c.endsWith(':')) return 'right';
             if (c.startsWith(':')) return 'left';
             return '';
         });
         inTable = true;
         continue;
      }

      inTable = true;
      tableRows.push(cells);
      continue;
    }

    flushList(); flushTable();

    // Definition Lists
    if (line.startsWith(': ') && i > 0 && lines[i-1].trim() !== '') {
       // It's a definition
       // We can represent it using dl/dt/dd but Penman doesn't have standard def lists
       // So we just use bold for previous line and indent for this.
       // Actually, easier to just output <dl>
       resultHtml += `<dl><dt>${parseInlineMarkdown(lines[i-1])}</dt><dd>${parseInlineMarkdown(line.substring(2))}</dd></dl>`;
       continue;
    }

    // Footnotes definition
    const fnDefMatch = line.match(/^\[\^([^\]]+)\]:\s+(.*)$/);
    if (fnDefMatch) {
       resultHtml += `<div class="penman-footnote" id="fn-${fnDefMatch[1]}"><sup>${fnDefMatch[1]}</sup> ${parseInlineMarkdown(fnDefMatch[2])}</div>`;
       continue;
    }

    // Paragraph
    if (line.length > 0) {
      // Handle trailing spaces (hard break)
      if (rawLine.endsWith('  ')) {
         resultHtml += `<p>${parseInlineMarkdown(line)}<br></p>`;
      } else {
         resultHtml += `<p>${parseInlineMarkdown(line)}</p>`;
      }
    } else {
      resultHtml += `<p><br></p>`;
    }
  }

  flushList(); flushTable(); flushBlockquote();

  const hasMarkdown = /#{1,6}\s|>\s|[-*+]\s|\d+\.\s|---|```|\[!|\*\*|__|\*|_|~~|`|\[.*\]\(.*\)|\!\[.*\]\(.*\)|\^\[|\|.*\|/.test(text);
  if (!hasMarkdown) {
      return text;
  }

  return resultHtml;
}

const EMOJI_MAP = {
  ':smile:': '😄', ':laughing:': '😆', ':blush:': '😊', ':smiley:': '😃', ':relaxed:': '☺️',
  ':smirk:': '😏', ':heart_eyes:': '😍', ':kissing_heart:': '😘', ':kissing_closed_eyes:': '😚',
  ':flushed:': '😳', ':relieved:': '😌', ':satisfied:': '😆', ':grin:': '😁', ':wink:': '😉',
  ':stuck_out_tongue_winking_eye:': '😜', ':stuck_out_tongue_closed_eyes:': '😝', ':grinning:': '😀',
  ':kissing:': '😗', ':kissing_smiling_eyes:': '😙', ':stuck_out_tongue:': '😛', ':sleeping:': '😴',
  ':worried:': '😟', ':frowning:': '😦', ':anguished:': '😧', ':open_mouth:': '😮', ':grimacing:': '😬',
  ':confused:': '😕', ':hushed:': '😯', ':expressionless:': '😬', ':unamused:': '😒', ':sweat_smile:': '😅',
  ':sweat:': '😓', ':disappointed_relieved:': '😥', ':weary:': '😩', ':pensive:': '😔', ':disappointed:': '😞',
  ':confounded:': '😖', ':fearful:': '😨', ':cold_sweat:': '😰', ':persevere:': '😣', ':cry:': '😢',
  ':sob:': '😭', ':joy:': '😂', ':astonished:': '😲', ':scream:': '😱', ':tired_face:': '😫',
  ':angry:': '😠', ':rage:': '😡', ':triumph:': '😤', ':sleepy:': '😪', ':yum:': '😋',
  ':mask:': '😷', ':sunglasses:': '😎', ':dizzy_face:': '😵', ':imp:': '👿', ':smiling_imp:': '😈',
  ':neutral_face:': '😐', ':no_mouth:': '😶', ':innocent:': '😇', ':alien:': '👽', ':yellow_heart:': '💛',
  ':blue_heart:': '💙', ':purple_heart:': '💜', ':heart:': '❤️', ':green_heart:': '💚', ':broken_heart:': '💔',
  ':heartbeat:': '💓', ':heartpulse:': '💗', ':two_hearts:': '💕', ':revolving_hearts:': '💞', ':cupid:': '💘',
  ':sparkling_heart:': '💖', ':sparkles:': '✨', ':star:': '⭐', ':star2:': '🌟', ':dizzy:': '💫',
  ':boom:': '💥', ':collision:': '💥', ':anger:': '💢', ':exclamation:': '❗', ':question:': '❓',
  ':grey_exclamation:': '❕', ':grey_question:': '❔', ':zzz:': '💤', ':dash:': '💨', ':sweat_drops:': '💦',
  ':notes:': '🎶', ':musical_note:': '🎵', ':fire:': '🔥', ':poop:': '💩', ':thumbsup:': '👍',
  ':thumbsdown:': '👎', ':ok_hand:': '👌', ':punch:': '👊', ':fist:': '✊', ':v:': '✌️',
  ':wave:': '👋', ':hand:': '✋', ':raised_hand:': '✋', ':open_hands:': '👐', ':point_up:': '☝️',
  ':point_down:': '👇', ':point_left:': '👈', ':point_right:': '👉', ':raised_hands:': '🙌', ':pray:': '🙏',
  ':point_up_2:': '👆', ':clap:': '👏', ':muscle:': '💪', ':metal:': '🤘', ':fu:': '🖕',
  ':runner:': '🏃', ':running:': '🏃', ':couple:': '👫', ':family:': '👪', ':two_men_holding_hands:': '👬',
  ':two_women_holding_hands:': '👭', ':dancer:': '💃', ':dancers:': '👯', ':ok_woman:': '🙆', ':no_good:': '🙅',
  ':information_desk_person:': '💁', ':raising_hand:': '🙋', ':bride_with_veil:': '👰', ':person_with_pouting_face:': '🙎',
  ':person_frowning:': '🙍', ':bow:': '🙇', ':couplekiss:': '💏', ':couple_with_heart:': '💑', ':massage:': '💆',
  ':haircut:': '💇', ':nail_care:': '💅', ':boy:': '👦', ':girl:': '👧', ':woman:': '👩',
  ':man:': '👨', ':baby:': '👶', ':older_woman:': '👵', ':older_man:': '👴', ':person_with_blond_hair:': '👱',
  ':man_with_gua_pi_mao:': '👲', ':man_with_turban:': '👳', ':construction_worker:': '👷', ':cop:': '👮', ':angel:': '👼',
  ':princess:': '👸', ':smiley_cat:': '😺', ':smile_cat:': '😸', ':heart_eyes_cat:': '😻', ':kissing_cat:': '😽',
  ':smirk_cat:': '😼', ':scream_cat:': '🙀', ':crying_cat_face:': '😿', ':joy_cat:': '😹', ':pouting_cat:': '😾',
  ':japanese_ogre:': '👹', ':japanese_goblin:': '👺', ':see_no_evil:': '🙈', ':hear_no_evil:': '🙉', ':speak_no_evil:': '🙊',
  ':guardsman:': '💂', ':skull:': '💀', ':feet:': '🐾', ':lips:': '💋', ':kiss:': '💋',
  ':droplet:': '💧', ':ear:': '👂', ':eyes:': '👀', ':nose:': '👃', ':tongue:': '👅',
  ':love_letter:': '💌', ':bust_in_silhouette:': '👤', ':busts_in_silhouette:': '👥', ':speech_balloon:': '💬', ':thought_balloon:': '💭',
  ':feelsgood:': '💯', ':finnadie:': '💯', ':goberserk:': '💯', ':godmode:': '💯', ':hurtrealbad:': '💯',
  ':suicide:': '💯', ':rage1:': '💯', ':rage2:': '💯', ':rage3:': '💯', ':rage4:': '💯',
  ':suspect:': '💯', ':trollface:': '💯'
};

function parseInlineMarkdown(text) {
  let safeText = escapeHtml(text);

  // Escaped characters (\* etc.) - unescape them
  safeText = safeText.replace(/\\([\\`*{}\[\]()#+\-.!_>~|])/g, '$1');

  // Bold + Italic
  safeText = safeText.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  safeText = safeText.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // Bold
  safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safeText = safeText.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  safeText = safeText.replace(/_(.*?)_/g, '<em>$1</em>');

  // Strikethrough
  safeText = safeText.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Inline Code
  safeText = safeText.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images
  safeText = safeText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links
  safeText = safeText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Autolinks
  safeText = safeText.replace(/&lt;((?:https?|ftp):\/\/[^&]+)&gt;/g, '<a href="$1">$1</a>');

  // Footnote inline
  safeText = safeText.replace(/\[\^([^\]]+)\]/g, '<sup class="penman-footnote-ref"><a href="#fn-$1">[$1]</a></sup>');

  // Emoji shortcodes to real unicode if exists
  safeText = safeText.replace(/:([a-z0-9_+-]+):/gi, (match, shortcode) => {
      const lower = ':' + shortcode.toLowerCase() + ':';
      return EMOJI_MAP[lower] ? EMOJI_MAP[lower] : match;
  });

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
