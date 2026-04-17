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

  it('should register bold, italic, and underline buttons', () => {
    expect(editor.ui.registry.buttons['bold']).toBeDefined();
    expect(editor.ui.registry.buttons['italic']).toBeDefined();
    expect(editor.ui.registry.buttons['underline']).toBeDefined();
  });

  it('should execute command when format button is clicked', () => {
    const executeSpy = vi.spyOn(editor, 'execCommand').mockImplementation(() => {});

    editor.ui.registry.buttons['bold'].onAction();
    expect(executeSpy).toHaveBeenCalledWith('bold');

    executeSpy.mockRestore();
  });
});
