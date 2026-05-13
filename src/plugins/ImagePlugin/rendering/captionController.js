/**
 * 4.3 Caption Behavior (Consistent Editing Model)
 * - Content Model: strictly limited to text and inline tags (b, i, u, a).
 * - Paste Event: Pasting HTML strips block tags (div, p, img) converting them to whitespace.
 * - Enter Key: Pressing ENTER inside caption prevents default (no new lines).
 *   It triggers blur() on the caption and moves the cursor to a new <p><br></p> block appended immediately after the figure.
 */
import { insertTextAtSelection } from '../../../utils/domCommands.js';

export function handleCaptionKeyDown(event, editor) {
  if (event.key === 'Enter') {
    const figcaption = event.target;
    // Strictly check if we are actually inside a caption before preventing default!
    if (figcaption && figcaption.tagName === 'FIGCAPTION') {
      event.preventDefault();
      figcaption.blur();

      const figure = figcaption.closest('figure');
      if (figure) {
        let nextSibling = figure.nextSibling;
        if (!nextSibling || nextSibling.tagName !== 'P') {
          const p = document.createElement('p');
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'IMG', 'FIGURE', 'TABLE', 'TR', 'TD'];

    function processAllowedContent(node, fragment) {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          fragment.appendChild(document.createTextNode(child.textContent));
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tagName = child.tagName;
          if (blockTags.includes(tagName)) {
            fragment.appendChild(document.createTextNode(' '));
            processAllowedContent(child, fragment);
            fragment.appendChild(document.createTextNode(' '));
          } else if (['B', 'I', 'U', 'A'].includes(tagName)) {
             const allowedNode = document.createElement(tagName.toLowerCase());
             if (tagName === 'A') {
               const href = child.getAttribute('href');
               if (href && !href.trim().toLowerCase().startsWith('javascript:')) {
                   allowedNode.setAttribute('href', href);
               } else {
                   allowedNode.setAttribute('href', '#');
               }
             }
             processAllowedContent(child, allowedNode);
             fragment.appendChild(allowedNode);
          } else {
             processAllowedContent(child, fragment);
          }
        }
      }
    }

    const fragment = document.createDocumentFragment();
    processAllowedContent(doc.body, fragment);

    // Normalize text nodes slightly by inserting it cleanly
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    tempDiv.innerHTML = tempDiv.innerHTML.replace(/\s+/g, ' '); // Clean excessive whitespace safely

    const finalFragment = document.createDocumentFragment();
    while (tempDiv.firstChild) {
       finalFragment.appendChild(tempDiv.firstChild);
    }

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (figcaption.contains(range.commonAncestorContainer)) {
          range.deleteContents();

          // To put cursor at the end, insert and then collapse
          const lastNode = finalFragment.lastChild;
          range.insertNode(finalFragment);

          if (lastNode) {
              range.setStartAfter(lastNode);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
          }
          figcaption.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } else if (text) {
    // Native selection-based text insertion. Replaces the deprecated
    // document.execCommand('insertText'). The helper writes the text at the
    // current selection (replacing any selected content) and collapses the
    // caret after it.
    insertTextAtSelection(text);
  }
}

export function handleCaptionBlur(event, editor) {
  if (editor && editor.history) {
    editor.history.pushImmediate();
  }
}
