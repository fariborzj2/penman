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

    // Simulate browser document manipulation side-effects during tests
    document.execCommand = vi.fn((cmd, ui, val) => { if (cmd === "bold") { const el = document.createElement("b"); const sel = window.getSelection(); if (sel.rangeCount) { const range = sel.getRangeAt(0); range.surroundContents(el); } } });
  });

  it('should execute custom registered commands', () => {
    const executeSpy = vi.fn();
    commandManager.register('myCustomCommand', {
      execute: executeSpy
    });

    commandManager.execute('myCustomCommand', 'someValue');
    expect(executeSpy).toHaveBeenCalledWith(editor, 'someValue');
  });

  it('should fallback to execCommand for whitelisted commands', () => {
    commandManager.execute('justifycenter');
    expect(document.execCommand).toHaveBeenCalledWith('justifycenter', false, null);
  });

  it('should correctly query state for whitelisted commands', () => {
    // Spy on document.queryCommandState
    document.queryCommandState = vi.fn().mockImplementation((cmd) => cmd === 'justifycenter');

    expect(commandManager.queryState('justifycenter')).toBe(true);
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

    commandManager._normalizeDOM();

    const html = editor.editableArea.innerHTML;
    expect(html).toContain('<strong>bold</strong>');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('<em>italic</em>');
    expect(html).not.toContain('<i>italic</i>');
  });
});
