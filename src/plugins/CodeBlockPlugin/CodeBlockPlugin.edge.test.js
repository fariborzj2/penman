/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin Edge Cases', () => {
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

    // Polyfill getBoundingClientRect for JSDOM
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
    }));
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('should preserve cursor character offset after re-highlighting', async () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript">const x = 1;</code></pre>');
    const code = editor.editableArea.querySelector('code');

    // Set cursor at textual offset 6 (after "const ")
    const range = document.createRange();
    range.setStart(code.firstChild, 6);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Trigger highlighting
    editor.editableArea.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify offset preservation using the same utility logic
    const newSel = window.getSelection();
    const newRange = newSel.getRangeAt(0);

    const preCaretRange = newRange.cloneRange();
    preCaretRange.selectNodeContents(code);
    preCaretRange.setEnd(newRange.endContainer, newRange.endOffset);
    const offset = preCaretRange.toString().length;

    expect(offset).toBe(6);
  });

  it('should handle paste of large code blocks and highlight immediately', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript"></code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.selectNodeContents(code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const largeCode = 'function test() {\n' + '  console.log("hello");\n'.repeat(50) + '}';
    const pasteEvent = new Event('paste', { bubbles: true });
    pasteEvent.clipboardData = {
        getData: (type) => type === 'text/plain' ? largeCode : ''
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    expect(code.textContent).toBe(largeCode);
    expect(code.innerHTML).toContain('hljs-'); // Immediate highlight check
  });

  it('should work correctly with Undo/Redo', async () => {
    editor.setContent('<p>Initial</p>');
    const p = editor.editableArea.querySelector('p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.commands.execute('INSERT_CODEBLOCK');
    const code = editor.editableArea.querySelector('code');
    expect(code).not.toBeNull();

    editor.history.undo();
    expect(editor.editableArea.querySelector('p')).not.toBeNull();
    expect(editor.editableArea.querySelector('pre')).toBeNull();

    editor.history.redo();
    expect(editor.editableArea.querySelector('pre')).not.toBeNull();
  });
});
