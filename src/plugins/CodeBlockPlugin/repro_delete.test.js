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

  it('prevents Backspace when at offset 0 in an empty code block', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr"></code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.setStart(code, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    const prevented = !editor.editableArea.dispatchEvent(backspaceEvent);

    expect(prevented).toBe(true);
    // It remained a pre
    expect(editor.editableArea.querySelector('pre')).not.toBeNull();
  });

  it('prevents Delete when at the end of an empty code block', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr"></code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.setStart(code, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
    const prevented = !editor.editableArea.dispatchEvent(deleteEvent);

    expect(prevented).toBe(true);
    expect(editor.editableArea.querySelector('pre')).not.toBeNull();
  });
});
