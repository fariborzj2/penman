/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { SelectionManager } from './SelectionManager.js';

describe('SelectionManager', () => {
  let editor;
  let selectionManager;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';

    editor = new Editor({ selector: '#editor' });
    selectionManager = editor.selection;
  });

  it('should save markers and restore them', () => {
    // Setup a fake selection
    editor.editableArea.innerHTML = 'Hello <span id="target">World</span>';
    const target = editor.editableArea.querySelector('#target');

    // Create a range using document API
    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Save should insert markers
    selectionManager.save();

    const htmlWithMarkers = editor.editableArea.innerHTML;
    expect(htmlWithMarkers).toContain('id="penman-selection-marker-start"');
    expect(htmlWithMarkers).toContain('id="penman-selection-marker-end"');

    // Simulate something that breaks selection but leaves HTML structure
    sel.removeAllRanges();

    // Restore should find markers, set selection, and remove markers
    selectionManager.restore();

    const restoredSel = window.getSelection();
    expect(restoredSel.rangeCount).toBeGreaterThan(0);

    // Markers should be cleaned up
    const htmlWithoutMarkers = editor.editableArea.innerHTML;
    expect(htmlWithoutMarkers).not.toContain('id="penman-selection-marker-start"');
    expect(htmlWithoutMarkers).not.toContain('id="penman-selection-marker-end"');
  });

  it('should not throw if trying to save when no selection is present or outside editable area', () => {
    const sel = window.getSelection();
    sel.removeAllRanges();

    expect(() => selectionManager.save()).not.toThrow();

    // Now try outside the editor
    document.body.insertAdjacentHTML('beforeend', '<div id="outside">Outside text</div>');
    const outsideEl = document.getElementById('outside');
    const range = document.createRange();
    range.selectNodeContents(outsideEl);
    sel.addRange(range);

    selectionManager.save();
    expect(editor.editableArea.innerHTML).not.toContain('penman-selection-marker');
  });
});
