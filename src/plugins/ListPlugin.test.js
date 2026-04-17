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
    let executedCmd = null;
    document.execCommand = (cmd) => { executedCmd = cmd; };

    editor.ui.registry.buttons['bullist'].onAction();

    expect(executedCmd).toBe('insertUnorderedList');
  });

  it('should create ordered list when numlist button is clicked', () => {
    let executedCmd = null;
    document.execCommand = (cmd) => { executedCmd = cmd; };

    editor.ui.registry.buttons['numlist'].onAction();

    expect(executedCmd).toBe('insertOrderedList');
  });
});
