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

  it('should use IconProvider to render button content with actual SVGs', () => {
    editor = new Editor({
      selector: '#editor',
      toolbar: 'bold italic'
    });

    const boldButton = document.querySelector('.penman-btn-bold');
    expect(boldButton.innerHTML).toContain('<svg');
    expect(boldButton.innerHTML).toContain('viewBox="0 0 24 24"');
  });

  it('should use fallback span for unknown icons', () => {
    editor = new Editor({
      selector: '#editor',
      toolbar: 'unknownCmd'
    });

    const unknownBtn = document.querySelector('.penman-btn-unknownCmd');
    expect(unknownBtn.innerHTML).toContain('penman-icon-fallback');
    expect(unknownBtn.innerHTML).toContain('UnknownCmd');
  });

  it('should update button active states when selection changes', () => {
    editor = new Editor({
      selector: '#editor',
      toolbar: 'bold italic'
    });

    const boldButton = document.querySelector('.penman-btn-bold');
    const italicButton = document.querySelector('.penman-btn-italic');

    // Initially they shouldn't have the active class
    expect(boldButton.className).not.toContain('penman-btn-active');
    expect(italicButton.className).not.toContain('penman-btn-active');

    // Mock queryState to return true for 'bold'
    editor.commands.queryState = vi.fn().mockImplementation(cmd => cmd === 'bold');

    // Simulate selection change
    editor.emit('selectionChange');

    // Now 'bold' should have active class, but not 'italic'
    expect(boldButton.className).toContain('penman-btn-active');
    expect(italicButton.className).not.toContain('penman-btn-active');
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
