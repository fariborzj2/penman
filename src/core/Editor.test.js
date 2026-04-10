// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from './Editor.js';

describe('Editor Core', () => {
  beforeEach(() => {
    // Setup a clean DOM
    document.body.innerHTML = '<textarea id="test-textarea">Initial Text</textarea>';
  });

  it('should throw an error if selector is not found', () => {
    expect(() => {
      new Editor({ selector: '#non-existent' });
    }).toThrow('Penman Editor: Could not find element with selector "#non-existent"');
  });

  it('should initialize and hide the original textarea', () => {
    const editor = new Editor({ selector: '#test-textarea' });
    expect(editor.textarea.style.display).toBe('none');
    expect(editor.editableArea).not.toBeNull();
    expect(editor.container).not.toBeNull();
    expect(editor.container.className).toBe('penman-wrapper');
    expect(editor.editableArea.className).toBe('penman-editor-area');
  });

  it('should implement getContent, setContent, and focus methods', () => {
    const editor = new Editor({ selector: '#test-textarea' });
    expect(editor.getContent()).toBe('Initial Text');

    editor.setContent('<p>New HTML</p>');
    expect(editor.getContent()).toBe('<p>New HTML</p>');
    expect(editor.textarea.value).toBe('<p>New HTML</p>');

    // Focus is hard to test fully in JSDOM, but we can verify it exists and runs without error
    expect(() => editor.focus()).not.toThrow();
  });

  it('should implement destroy method', () => {
    const editor = new Editor({ selector: '#test-textarea' });
    expect(editor.textarea.style.display).toBe('none');

    editor.destroy();
    expect(editor.textarea.style.display).toBe('');
    expect(document.querySelector('.penman-wrapper')).toBeNull();
    expect(editor.container).toBeNull();
  });

  it('should sync changes from editable area to textarea', () => {
    const editor = new Editor({ selector: '#test-textarea' });

    // Simulate typing
    editor.editableArea.innerHTML = 'New Content';

    // Trigger input event manually
    const event = new Event('input');
    editor.editableArea.dispatchEvent(event);

    expect(editor.textarea.value).toBe('New Content');
  });
});
