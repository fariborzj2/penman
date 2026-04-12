/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import penman from '../index.js';
import { setupFindReplacePlugin } from './FindReplacePlugin.js';

describe('FindReplacePlugin', () => {
  let editor;
  let wrapper;
  let textarea;

  beforeEach(() => {
    wrapper = document.createElement('div');
    textarea = document.createElement('textarea');
    textarea.id = 'fr-textarea';
    wrapper.appendChild(textarea);
    document.body.appendChild(wrapper);

    editor = penman.init({
      selector: '#fr-textarea',
      toolbar: 'findreplace',
      plugins: ['findreplace']
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    const overlays = document.querySelectorAll('.penman-modal-overlay');
    overlays.forEach(overlay => overlay.remove());
  });

  it('should register findreplace command', () => {
    expect(editor.ui.registry.buttons['findreplace']).toBeDefined();
    expect(editor.ui.registry.buttons['findreplace'].text).toBe('Find and Replace');
  });

  it('should open a modal when action is triggered', () => {
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('#fr-find')).not.toBeNull();
    expect(overlay.querySelector('#fr-replace')).not.toBeNull();
  });

  it('should execute search and enable secondary buttons when results are found', () => {
    editor.setContent('<p>Hello world. Welcome to the world of testing.</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplace = overlay.querySelector('#fr-btn-replace');

    inputFind.value = 'world';
    btnFind.click();

    expect(btnReplace.disabled).toBe(false);
  });

  it('should replace text correctly', () => {
    // Mock execCommand for JSDOM
    let originalExecCommand = document.execCommand;
    document.execCommand = function(cmd, showUI, value) {
        if (cmd === 'insertHTML') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(value));
            }
            return true;
        }
        return originalExecCommand(cmd, showUI, value);
    };

    editor.setContent('<p>Hello world.</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const inputReplace = overlay.querySelector('#fr-replace');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplace = overlay.querySelector('#fr-btn-replace');

    inputFind.value = 'world';
    inputReplace.value = 'Penman';
    btnFind.click();
    btnReplace.click();

    expect(editor.getContent()).toContain('Penman');
    expect(editor.getContent()).not.toContain('world');

    document.execCommand = originalExecCommand;
  });
});
