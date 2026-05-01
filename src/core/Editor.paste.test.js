/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from './Editor.js';

describe('Editor Paste CRLF Normalization', () => {
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('textarea');
    document.body.appendChild(container);

    editor = new Editor({
      element: container,
      plugins: []
    });

    // Mock document.execCommand for JSDOM
    document.execCommand = vi.fn().mockImplementation((cmd, showUI, value) => {
      if (cmd === 'insertHTML') {
        const sel = window.getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();

          const temp = document.createElement('div');
          temp.innerHTML = value;
          const frag = document.createDocumentFragment();
          while (temp.firstChild) {
            frag.appendChild(temp.firstChild);
          }
          range.insertNode(frag);
        }
        return true;
      }
      return false;
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('should normalize CRLF to LF when pasting raw text into regular editor', () => {
    editor.setContent('<p>Initial</p>');
    const p = editor.editableArea.querySelector('p');

    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false); // end of p
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      getData: vi.fn().mockImplementation((type) => {
        if (type === 'text/plain') return 'line1\r\nline2\r\nline3';
        return '';
      })
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    const html = editor.getContent();
    expect(html).toContain('line1</p><p>line2</p><p>line3');
  });
});
