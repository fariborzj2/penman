// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { setupLinkPlugin } from './LinkPlugin.js';

describe('LinkPlugin Editing', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="test-textarea"></textarea>';
    editor = new Editor({ selector: '#test-textarea' });
    setupLinkPlugin(editor);
    // Mock UI modal
    editor.ui.createModal = vi.fn();
  });

  it('should pre-fill modal with existing link data when selection is inside a link', () => {
    editor.setContent('<p><a href="https://existing.com" target="_self" rel="nofollow">Link Text</a></p>');
    const a = editor.editableArea.querySelector('a');

    // Position selection inside the link
    const range = document.createRange();
    range.setStart(a.firstChild, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const linkBtn = editor.ui.registry.buttons['link'];
    linkBtn.onAction();

    expect(editor.ui.createModal).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('value="https://existing.com"'),
    }));

    const modalBody = editor.ui.createModal.mock.calls[0][0].body;
    expect(modalBody).toContain('value="Link Text"');
    expect(modalBody).toContain('value="_self" selected');
    expect(modalBody).toContain('value="nofollow"');
  });

  it('should set default attributes for new links', () => {
    editor.setContent('<p>New text</p>');
    const p = editor.editableArea.querySelector('p');

    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const linkBtn = editor.ui.registry.buttons['link'];
    linkBtn.onAction();

    const modalBody = editor.ui.createModal.mock.calls[0][0].body;
    expect(modalBody).toContain('value="_blank" selected');
    expect(modalBody).toContain('value="noopener"');
  });

  it('should update existing link instead of creating a new one', () => {
    editor.setContent('<p><a href="https://old.com">Old Link</a></p>');
    const a = editor.editableArea.querySelector('a');

    const range = document.createRange();
    range.setStart(a.firstChild, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const linkBtn = editor.ui.registry.buttons['link'];
    linkBtn.onAction();

    const onSubmit = editor.ui.createModal.mock.calls[0][0].onSubmit;
    onSubmit({
      url: 'https://new.com',
      text: 'New Text',
      target: '_blank',
      rel: 'noopener'
    });

    expect(a.getAttribute('href')).toBe('https://new.com');
    expect(a.innerText).toBe('New Text');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener');
    expect(editor.editableArea.querySelectorAll('a').length).toBe(1);
  });
});
