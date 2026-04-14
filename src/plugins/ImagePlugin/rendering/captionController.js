/**
 * 4.3 Caption Behavior (Consistent Editing Model)
 * - Content Model: strictly limited to text and inline tags (b, i, u, a).
 * - Paste Event: Pasting HTML strips block tags (div, p, img) converting them to whitespace.
 * - Enter Key: Pressing ENTER inside caption prevents default (no new lines).
 *   It triggers blur() on the caption and moves the cursor to a new <p><br></p> block appended immediately after the figure.
 */

export function handleCaptionKeyDown(event, editor) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const figcaption = event.target;
    if (figcaption && figcaption.tagName === 'FIGCAPTION') {
      figcaption.blur();

      const figure = figcaption.closest('figure');
      if (figure) {
        let nextSibling = figure.nextSibling;
        if (!nextSibling || nextSibling.tagName !== 'P') {
          const p = document.createElement('p');
          p.appendChild(document.createElement('br'));
          figure.parentNode.insertBefore(p, nextSibling);
          nextSibling = p;
        }

        // Move cursor to the paragraph
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(nextSibling, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
}

export function handleCaptionPaste(event) {
  event.preventDefault();

  const clipboardData = event.clipboardData || window.clipboardData;
  const html = clipboardData.getData('text/html');
  const text = clipboardData.getData('text/plain');

  const figcaption = event.target.closest('figcaption');
  if (!figcaption) return;

  if (html) {
    // Paste Event: Pasting HTML strips block tags (div, p, img) converting them to whitespace.
    // Content Model: strictly limited to text and inline tags (b, i, u, a).

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Convert block elements to text with space
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'IMG', 'FIGURE', 'TABLE', 'TR', 'TD'];

    function extractAllowedContent(node) {
      let content = '';
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          content += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tagName = child.tagName;
          if (blockTags.includes(tagName)) {
            content += ' ' + extractAllowedContent(child) + ' ';
          } else if (['B', 'I', 'U', 'A'].includes(tagName)) {
             // Create an allowed tag
             const allowedNode = document.createElement(tagName.toLowerCase());
             if (tagName === 'A') {
               allowedNode.href = child.href || '#';
             }
             allowedNode.innerHTML = extractAllowedContent(child);
             content += allowedNode.outerHTML;
          } else {
             content += extractAllowedContent(child);
          }
        }
      }
      return content;
    }

    let cleanHTML = extractAllowedContent(doc.body);
    // Replace multiple spaces
    cleanHTML = cleanHTML.replace(/\s+/g, ' ');

    document.execCommand('insertHTML', false, cleanHTML);
  } else if (text) {
    document.execCommand('insertText', false, text);
  }
}

export function handleCaptionBlur(event, editor) {
  // 6.3 Standard Operations
  // Caption changes trigger a snapshot only on blur, not per keystroke.

  // We need to compare if content changed, but snapshot on blur is required.
  // Assuming HistoryManager is attached to editor.
  if (editor && editor.history) {
    editor.history.saveSnapshot();
  }
}
