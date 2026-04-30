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

    // Current code prevents this, so it will still be a PRE.
    // We WANT it to be a P.
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
