/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { setupLinkPlugin } from './LinkPlugin.js';

describe('LinkPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({ selector: '#editor' });
    setupLinkPlugin(editor);
  });

  it('should register link button', () => {
    expect(editor.ui.registry.buttons['link']).toBeDefined();
  });

  it('should open modal with current selection text', () => {
    editor.editableArea.innerHTML = '<p id="target">Hello World</p>';
    const target = editor.editableArea.querySelector('#target');

    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const createModalSpy = vi.spyOn(editor.ui, 'createModal').mockImplementation(() => {});

    editor.ui.registry.buttons['link'].onAction();

    expect(createModalSpy).toHaveBeenCalled();
    const modalArgs = createModalSpy.mock.calls[0][0];
    expect(modalArgs.title).toBe('Insert Link');
    expect(modalArgs.body).toContain('Hello World');

    createModalSpy.mockRestore();
  });

  it('should insert correct HTML when submitted', () => {
    let submitCallback;
    const createModalSpy = vi.spyOn(editor.ui, 'createModal').mockImplementation((options) => {
      submitCallback = options.onSubmit;
    });
    const insertContentSpy = vi.spyOn(editor, 'insertContent').mockImplementation(() => {});

    editor.ui.registry.buttons['link'].onAction();

    // Simulate submission
    submitCallback({
      url: 'https://example.com',
      text: 'My Link',
      target: '_blank',
      rel: 'noopener'
    });

    expect(insertContentSpy).toHaveBeenCalledWith('<a href="https://example.com" target="_blank" rel="noopener">My Link</a>');

    createModalSpy.mockRestore();
    insertContentSpy.mockRestore();
  });
});
