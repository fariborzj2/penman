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

  it('should execute command when list buttons are clicked', () => {
    const executeSpy = vi.spyOn(editor, 'execCommand').mockImplementation(() => {});

    editor.ui.registry.buttons['bullist'].onAction();
    expect(executeSpy).toHaveBeenCalledWith('insertUnorderedList');

    editor.ui.registry.buttons['numlist'].onAction();
    expect(executeSpy).toHaveBeenCalledWith('insertOrderedList');

    executeSpy.mockRestore();
  });
});
