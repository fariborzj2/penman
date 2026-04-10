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
