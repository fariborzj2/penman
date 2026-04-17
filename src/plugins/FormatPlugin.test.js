/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { setupFormatPlugin } from './FormatPlugin.js';

describe('FormatPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({ selector: '#editor' });
    setupFormatPlugin(editor);
  });

  it('should register bold, italic, underline, and strikethrough buttons', () => {
    expect(editor.ui.registry.buttons['bold']).toBeDefined();
    expect(editor.ui.registry.buttons['italic']).toBeDefined();
    expect(editor.ui.registry.buttons['underline']).toBeDefined();
    expect(editor.ui.registry.buttons['strikethrough']).toBeDefined();
  });

  it('should execute command when format button is clicked', () => {
    editor.editableArea.innerHTML = '<p id="target">Test</p>';
    const target = editor.editableArea.querySelector('#target');

    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.ui.registry.buttons['bold'].onAction();

    expect(editor.editableArea.innerHTML).toContain('<strong>Test</strong>');
  });
});
