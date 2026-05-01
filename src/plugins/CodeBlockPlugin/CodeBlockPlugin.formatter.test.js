/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin Paste Formatter', () => {
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

  it('should auto-format compact JavaScript code when pasted', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript"></code></pre>');
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
        if (type === 'text/plain') return 'function test(){console.log("hello");}';
        return '';
      })
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    const formatted = code.textContent;
    expect(formatted).toContain('function test() {\n  console.log("hello");\n}');
  });

  it('should not mutate multi-line strings when formatting', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript"></code></pre>');
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
        if (type === 'text/plain') return 'const a = 1;\nconst b = 2;';
        return '';
      })
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    // Multi-line code is left alone by formatCode
    const formatted = code.textContent;
    expect(formatted).toBe('const a = 1;\nconst b = 2;');
  });
});
