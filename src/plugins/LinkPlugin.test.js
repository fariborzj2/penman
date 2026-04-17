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

    editor.ui.registry.buttons['link'].onAction();

    const modal = document.querySelector('.penman-modal');
    expect(modal).not.toBeNull();
    const modalTitle = modal.querySelector('h3').textContent;
    expect(modalTitle).toBe('Insert Link');

    const textInput = modal.querySelector('#penman-link-text');
    expect(textInput.value).toBe('Hello World');

    // Close modal to clean up DOM
    const closeBtn = modal.querySelector('.penman-modal-close');
    closeBtn.click();
  });

  it('should insert correct HTML into the editor when submitted', () => {
    editor.editableArea.innerHTML = '<p id="target">Link this text</p>';
    const target = editor.editableArea.querySelector('#target');

    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Using execCommand 'insertHTML' is standard for inserting links in this editor setup for content insertion
    let insertedHTML = '';
    document.execCommand = (cmd, showUI, value) => {
      if (cmd === 'insertHTML') {
        insertedHTML = value;
      }
    };

    editor.ui.registry.buttons['link'].onAction();
    const modal = document.querySelector('.penman-modal');

    const urlInput = modal.querySelector('#penman-link-url');
    urlInput.value = 'https://example.com';

    const textInput = modal.querySelector('#penman-link-text');
    textInput.value = 'My Link';

    const targetInput = modal.querySelector('#penman-link-target');
    targetInput.value = '_blank';

    const relInput = modal.querySelector('#penman-link-rel');
    relInput.value = 'noopener';

    const submitBtn = modal.querySelector('.penman-modal-btn-submit');
    submitBtn.click();

    expect(insertedHTML).toBe('<a href="https://example.com" target="_blank" rel="noopener">My Link</a>');
  });
});
