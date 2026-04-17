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
    let insertedCommand = null;
    let insertedValue = null;
    document.execCommand = (cmd, showUI, value) => {
        insertedCommand = cmd;
        insertedValue = value;
    };

    // We will verify through side-effects rather than vi.fn directly on execCommand.
  });

  it('should execute custom registered commands', () => {
    let executed = false;
    let receivedValue = null;
    commandManager.register('myCustomCommand', {
      execute: (ed, val) => {
          executed = true;
          receivedValue = val;
      }
    });

    commandManager.execute('myCustomCommand', 'someValue');
    expect(executed).toBe(true);
    expect(receivedValue).toBe('someValue');
  });

  it('should fallback to execCommand for whitelisted commands', () => {
    let lastCmd = null;
    document.execCommand = (cmd) => { lastCmd = cmd; };
    commandManager.execute('justifycenter');
    expect(lastCmd).toBe('justifycenter');
  });

  it('should correctly query state for whitelisted commands', () => {
    document.queryCommandState = (cmd) => cmd === 'justifycenter';

    expect(commandManager.queryState('justifycenter')).toBe(true);
    expect(commandManager.queryState('italic')).toBe(false);

    // Unwhitelisted/Unregistered command
    expect(commandManager.queryState('unregisteredCommand')).toBe(false);
  });

  it('should pass value correctly on fallback execute', () => {
    let lastCmd = null;
    let lastValue = null;
    document.execCommand = (cmd, show, val) => {
        lastCmd = cmd;
        lastValue = val;
    };

    commandManager.execute('justifycenter', 'value');
    expect(lastCmd).toBe('justifycenter');
    expect(lastValue).toBe('value');
  });

  it('should block non-whitelisted and non-registered commands', () => {
    let lastCmd = null;
    document.execCommand = (cmd) => { lastCmd = cmd; };
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    commandManager.execute('insertImage', 'http://example.com');

    expect(lastCmd).toBeNull();
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
