/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin Deletion', () => {
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
    vi.restoreAllMocks();
  });

  it('should convert an empty code block to a paragraph when Backspace is pressed', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr"></code></pre>');
    const code = editor.editableArea.querySelector('code');
    
    const range = document.createRange();
    range.setStart(code, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    editor.editableArea.dispatchEvent(backspaceEvent);

    expect(editor.editableArea.querySelector('pre')).toBeNull();
    expect(editor.editableArea.querySelector('p')).not.toBeNull();
  });

  it('should convert an empty code block to a paragraph when Delete is pressed', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr"></code></pre>');
    const code = editor.editableArea.querySelector('code');
    
    const range = document.createRange();
    range.setStart(code, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
    editor.editableArea.dispatchEvent(deleteEvent);

    expect(editor.editableArea.querySelector('pre')).toBeNull();
    expect(editor.editableArea.querySelector('p')).not.toBeNull();
  });
});

describe('CodeBlockPlugin Text Extraction', () => {
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
    vi.restoreAllMocks();
  });

  it('should not merge lines when extracting text from code node during healAndPatch', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript"><span class="penman-token-keyword">let</span> <span class="penman-token-plain">x = 1;</span><br><span class="penman-token-comment">// comment</span><br><span class="penman-token-keyword">let</span> <span class="penman-token-plain">y = 2;</span></code></pre>');
    const pre = editor.editableArea.querySelector('pre');

    const inputEvent = new Event('input', { bubbles: true, cancelable: true });

    const code = editor.editableArea.querySelector('code');
    const range = document.createRange();
    range.setStart(code, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.editableArea.dispatchEvent(inputEvent);

    const html = editor.editableArea.innerHTML;

    expect(html).toContain('<span class="penman-token-keyword">let</span>');
    expect(html).toContain('<span class="penman-token-comment">// comment</span>');
    expect(html).toContain('y <span class="penman-token-operator">=</span>');
    // We expect the 'let' on the 3rd line to be a keyword, not plain/comment
    expect(html.match(/<span class="penman-token-keyword">let<\/span>/g).length).toBe(2);
  });
});
