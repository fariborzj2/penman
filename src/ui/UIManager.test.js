/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { UIManager } from './UIManager.js';

describe('UIManager', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
  });

  it('should not render toolbar if not configured', () => {
    editor = new Editor({ selector: '#editor' }); // no toolbar config
    const toolbar = document.querySelector('.penman-toolbar');
    expect(toolbar).toBeNull();
  });

  it('should render toolbar based on configuration string', () => {
    editor = new Editor({
      selector: '#editor',
      toolbar: 'bold italic | underline'
    });

    const toolbar = document.querySelector('.penman-toolbar');
    expect(toolbar).not.toBeNull();

    const buttons = toolbar.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].className).toContain('penman-btn-bold');
    expect(buttons[1].className).toContain('penman-btn-italic');
    expect(buttons[2].className).toContain('penman-btn-underline');

    const separators = toolbar.querySelectorAll('.penman-separator');
    expect(separators.length).toBe(1);
  });

  it('should call editor.execCommand when a button is clicked', () => {
    // Mock execCommand to avoid Uncaught Exception when JSDOM evaluates the fallback
    document.execCommand = vi.fn();

    editor = new Editor({
      selector: '#editor',
      toolbar: 'bold'
    });

    const execCommandSpy = vi.spyOn(editor, 'execCommand');

    const button = document.querySelector('.penman-btn-bold');
    button.click();

    expect(execCommandSpy).toHaveBeenCalledWith('bold');
  });

  it('should destroy the toolbar element when editor is destroyed', () => {
    editor = new Editor({
      selector: '#editor',
      toolbar: 'bold'
    });

    expect(document.querySelector('.penman-toolbar')).not.toBeNull();

    editor.destroy();

    expect(document.querySelector('.penman-toolbar')).toBeNull();
  });
});
