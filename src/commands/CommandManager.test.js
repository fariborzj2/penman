/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { CommandManager } from './CommandManager.js';

describe('CommandManager', () => {
  let editor;
  let commandManager;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({ selector: '#editor' });
    commandManager = editor.commands;

    // Mock execCommand to avoid actual browser document manipulation side-effects during some tests
    document.execCommand = vi.fn((cmd, ui, val) => { if (cmd === "bold") { const el = document.createElement("b"); const sel = window.getSelection(); if (sel.rangeCount) { const range = sel.getRangeAt(0); range.surroundContents(el); } } });
  });

  it('should execute custom registered commands', () => {
    const mockExecute = vi.fn();
    commandManager.register('myCustomCommand', {
      execute: mockExecute
    });

    commandManager.execute('myCustomCommand', 'someValue');
    expect(mockExecute).toHaveBeenCalledWith(editor, 'someValue');
  });

  it('should fallback to execCommand for whitelisted commands', () => {
    commandManager.execute('bold');
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);
  });

  it('should correctly query state for whitelisted commands', () => {
    // Mock document.queryCommandState
    document.queryCommandState = vi.fn().mockImplementation((cmd) => cmd === 'bold');

    expect(commandManager.queryState('bold')).toBe(true);
    expect(commandManager.queryState('italic')).toBe(false);

    // Unwhitelisted/Unregistered command
    expect(commandManager.queryState('unregisteredCommand')).toBe(false);
  });

  it('should pass value correctly on fallback execute', () => {
    commandManager.execute('justifycenter', 'value');
    expect(document.execCommand).toHaveBeenCalledWith('justifycenter', false, 'value');
  });

  it('should block non-whitelisted and non-registered commands', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    commandManager.execute('insertImage', 'http://example.com');

    expect(document.execCommand).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('should normalize DOM elements (e.g., b to strong)', () => {
    // Setup initial DOM with 'b' tags
    editor.editableArea.innerHTML = 'Hello <b>bold</b> and <i>italic</i> world';

    // We mock execCommand to not do anything, so we just test the normalization phase
    // Wait, let's actually just call _normalizeDOM directly to test the isolation
    commandManager._normalizeDOM();

    const html = editor.editableArea.innerHTML;
    expect(html).toContain('<strong>bold</strong>');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('<em>italic</em>');
    expect(html).not.toContain('<i>italic</i>');
  });
});
