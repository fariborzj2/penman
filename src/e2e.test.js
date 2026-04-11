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

  it('should support plugin manager registration and initialization', () => {
    let pluginLoaded = false;
    penman.PluginManager.add('testPlugin', (editorInstance) => {
      pluginLoaded = true;
      editorInstance.testFlag = 'working';
    });

    const editor = penman.init({
      selector: '#e2e-editor',
      plugins: ['testPlugin']
    });

    expect(pluginLoaded).toBe(true);
    expect(editor.testFlag).toBe('working');

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
