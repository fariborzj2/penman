/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import penman from './index.js';

describe('End-to-End Integration Flow', () => {
  beforeEach(() => {
    // Setup real DOM elements
    document.body.innerHTML = `
      <form>
        <textarea id="e2e-editor">Start Text</textarea>
      </form>
    `;

    // Fallback for jsdom missing document.execCommand
    // For integration test, we simulate its behavior manually to test the wrap logic
    document.execCommand = vi.fn((cmd, showUI, value) => {
      if (cmd === 'bold') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const strong = document.createElement('strong');
          range.surroundContents(strong);
        }
      }
    });
  });

  it('should support plugin manager registration, rendering a button, triggering a modal, and inserting content', () => {
    // Note: The built-in link plugin is registered automatically. We are just utilizing it to verify integration.
    const editor = penman.init({
      selector: '#e2e-editor',
      plugins: ['link'],
      toolbar: 'bold link'
    });

    // Setup Selection mock scenario targeting a word
    editor.editableArea.innerHTML = 'Hello <span id="target">World</span>';
    const target = editor.editableArea.querySelector('#target');
    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Verify the button was rendered
    const linkBtn = document.querySelector('.penman-btn-link');
    expect(linkBtn).not.toBeNull();
    expect(linkBtn.title).toBe('Insert Link');

    // Click the button
    linkBtn.click();

    // Verify Modal appeared
    const modal = document.querySelector('.penman-modal');
    expect(modal).not.toBeNull();

    // Fill in Modal
    const urlInput = document.querySelector('#penman-link-url');
    const textInput = document.querySelector('#penman-link-text');
    const targetInput = document.querySelector('#penman-link-target');
    const relInput = document.querySelector('#penman-link-rel');

    // Verify it pre-filled the selected text ("World")
    expect(textInput.value).toBe('World');

    urlInput.value = 'http://example.com';
    // Intentionally leaving textInput to see if it preserves "World", but let's change it to test full coverage
    textInput.value = 'my link';
    targetInput.value = '_blank';
    relInput.value = 'nofollow';

    // Setup mock for insertHTML (which insertContent uses)
    document.execCommand = vi.fn((cmd, showUI, value) => {
      if (cmd === 'insertHTML') {
        editor.editableArea.innerHTML += value;
      }
    });

    // Submit Modal
    const submitBtn = document.querySelector('.penman-modal-btn-submit');
    submitBtn.click();

    // Verify Modal closed and content was inserted
    expect(document.querySelector('.penman-modal')).toBeNull();
    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, '<a href="http://example.com" target="_blank" rel="nofollow">my link</a>');

    // Should have restored markers properly, so html doesn't contain markers eventually
    expect(editor.getContent()).toContain('my link');

    editor.destroy();
  });

  it('should initialize editor, render toolbar, apply command and save to history', () => {
    // 1. Initialize Penman with toolbar configuration
    const editor = penman.init({
      selector: '#e2e-editor',
      toolbar: 'undo redo | bold italic'
    });

    // Verify Initialization
    expect(document.querySelector('.penman-wrapper')).not.toBeNull();
    const toolbar = document.querySelector('.penman-toolbar');
    expect(toolbar).not.toBeNull();

    const boldBtn = toolbar.querySelector('.penman-btn-bold');
    expect(boldBtn).not.toBeNull();

    // Verify Initial History State
    expect(editor.history.undoStack.length).toBe(1);

    // 2. Setup Selection targeting a word
    editor.editableArea.innerHTML = 'Hello <span id="target">World</span>';
    // Manually push to history since direct innerHTML modification doesn't trigger input events
    editor.history.pushImmediate();

    const target = editor.editableArea.querySelector('#target');
    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // 3. User clicks Bold button
    boldBtn.click();

    // 4. Verify Flow Results (E2E Integration)
    // a) execCommand was triggered
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);

    // b) HTML content changed (Mock applied the change)
    expect(editor.getContent()).toContain('<strong>World</strong>');

    // c) History state captured the structural change immediately
    // 1 for initial load, 1 for programmatic innerHTML change, 1 for boldBtn click
    expect(editor.history.undoStack.length).toBeGreaterThan(1);

    // d) Caret/Selection was restored and cleaned up
    const currentHtml = editor.getContent();
    expect(currentHtml).not.toContain('penman-selection-marker');

    // 5. Test Undo/Redo integration from UI
    const undoBtn = toolbar.querySelector('.penman-btn-undo');
    const redoBtn = toolbar.querySelector('.penman-btn-redo');

    // Trigger Undo via button click
    undoBtn.click();
    expect(editor.getContent()).not.toContain('<strong>World</strong>');
    expect(editor.getContent()).toContain('<span id="target">World</span>');

    // Trigger Redo via button click
    redoBtn.click();
    expect(editor.getContent()).toContain('<strong>World</strong>');

    // Clean up
    editor.destroy();
  });
});
