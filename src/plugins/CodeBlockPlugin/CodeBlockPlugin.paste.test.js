/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin Paste Normalization', () => {
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('textarea');
    document.body.appendChild(container);

    editor = new Editor({
      element: container,
      plugins: []
    });

    setupCodeBlockPlugin(editor);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('should normalize CRLF to LF when pasting raw text', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr"></code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.setStart(code, 0);
    range.collapse(true);
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

    expect(code.textContent).toContain('line1\nline2\nline3');
    expect(code.textContent).not.toContain('\r\n');
  });
});
