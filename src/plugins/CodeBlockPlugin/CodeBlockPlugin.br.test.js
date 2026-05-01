/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin br to newline conversion', () => {
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

  it('should preserve newlines when converting from a paragraph with <br> tags', () => {
    editor.setContent('<p>line1<br>line2</p>');

    const p = editor.editableArea.querySelector('p');
    const range = document.createRange();
    range.setStart(p.childNodes[0], 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.execCommand('INSERT_CODEBLOCK');

    const code = editor.editableArea.querySelector('code');
    expect(code).not.toBeNull();
    expect(code.textContent).toContain('line1\nline2');
  });
});
