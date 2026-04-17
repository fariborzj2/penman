/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { setupListPlugin } from './ListPlugin.js';

describe('ListPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({ selector: '#editor' });
    setupListPlugin(editor);
  });

  it('should register bullist and numlist buttons', () => {
    expect(editor.ui.registry.buttons['bullist']).toBeDefined();
    expect(editor.ui.registry.buttons['numlist']).toBeDefined();
  });

  it('should create unordered list when bullist button is clicked', () => {
    editor.editableArea.innerHTML = '<p id="target">List item</p>';
    const target = editor.editableArea.querySelector('#target');

    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.ui.registry.buttons['bullist'].onAction();

    expect(editor.editableArea.innerHTML).toContain('<ul><li>List item</li></ul>');
  });

  it('should create ordered list when numlist button is clicked', () => {
    editor.editableArea.innerHTML = '<p id="target">List item</p>';
    const target = editor.editableArea.querySelector('#target');

    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.ui.registry.buttons['numlist'].onAction();

    expect(editor.editableArea.innerHTML).toContain('<ol><li>List item</li></ol>');
  });
});
