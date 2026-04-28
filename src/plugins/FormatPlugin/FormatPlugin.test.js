/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupFormatPlugin } from './FormatPlugin.js';

describe('FormatPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({ selector: '#editor' });
    setupFormatPlugin(editor);
  });

  it('should register bold, italic, underline, strikethrough, superscript, and subscript buttons', () => {
    expect(editor.ui.registry.buttons['bold']).toBeDefined();
    expect(editor.ui.registry.buttons['italic']).toBeDefined();
    expect(editor.ui.registry.buttons['underline']).toBeDefined();
    expect(editor.ui.registry.buttons['strikethrough']).toBeDefined();
    expect(editor.ui.registry.buttons['superscript']).toBeDefined();
    expect(editor.ui.registry.buttons['subscript']).toBeDefined();
  });

  it('should execute command when format button is clicked on non-collapsed selection', () => {
    let executedCmd = null;
    document.execCommand = (cmd) => { executedCmd = cmd; };
    
    // Mock non-collapsed selection
    window.getSelection = () => ({
        isCollapsed: false,
        getRangeAt: () => ({}),
        removeAllRanges: () => {},
        addRange: () => {}
    });

    editor.ui.registry.buttons['bold'].onAction();

    expect(executedCmd).toBe('bold');
  });
  
  it('should store pending format on collapsed selection', () => {
    window.getSelection = () => ({
        isCollapsed: true,
        getRangeAt: () => ({}),
        removeAllRanges: () => {},
        addRange: () => {}
    });
    
    document.queryCommandState = () => false;

    editor.ui.registry.buttons['bold'].onAction();
    expect(editor._pendingFormats.has('bold')).toBe(true);
    
    // second click removes it
    editor.ui.registry.buttons['bold'].onAction();
    expect(editor._pendingFormats.has('bold')).toBe(false);
  });
});
