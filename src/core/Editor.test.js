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

  it('should verify the UIManager correctly renders the toolbar element', () => {
    const editor = new Editor({
      selector: '#test-textarea',
      toolbar: 'bold italic'
    });

    // Check if toolbar is injected in the wrapper
    const toolbar = editor.container.querySelector('div');
    expect(toolbar).not.toBeNull();

    // Check if buttons were created (ignoring the dropdown button)
    const buttons = Array.from(toolbar.querySelectorAll('button')).filter(b => !b.classList.contains('penman-dropdown-trigger'));
    expect(buttons.length).toBe(2);
    expect(buttons[0].title.toLowerCase()).toBe('bold');
    expect(buttons[1].title.toLowerCase()).toBe('italic');
  });

  it('should trigger CommandManager correctly when a generated toolbar button is clicked', () => {
    const editor = new Editor({
      selector: '#test-textarea',
      toolbar: 'bold'
    });

    // Replace document.execCommand to intercept it
    let executedCmd = null;
    // Since we removed bold from fallbackWhitelist, we need to register it in the test
    editor.commands.register('bold', {
      execute: (ed, val) => { executedCmd = 'bold'; }
    });

    const boldBtn = editor.container.querySelector('button[title="bold"]');
    expect(boldBtn).not.toBeNull();

    // Trigger click
    boldBtn.click();

    expect(executedCmd).toBe('bold');
  });

  it('should push a snapshot to HistoryManager and trigger undo on Ctrl+Z', () => {
    const editor = new Editor({ selector: '#test-textarea' });
    editor.commands.register('bold', { execute: () => { editor.editableArea.innerHTML = 'bold'; } });

    // Check initial state
    expect(editor.history.undoStack.length).toBe(1);

    // Change content to ensure the snapshot is different
    // (If html is exactly the same, pushImmediate ignores it)
    editor.setContent('Some different text for history test');

    // Make a change using a command
    editor.commands.register('justifycenter', { execute: () => { editor.editableArea.innerHTML = 'justifycenter'; } });
    editor.execCommand('justifycenter');

    // Should have 2 states now (initial + bold)
    expect(editor.history.undoStack.length).toBe(2);

    // Simulate Ctrl+Z
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
    editor.editableArea.dispatchEvent(event);

    // Should have moved state to redoStack
    expect(editor.history.undoStack.length).toBe(1);
    expect(editor.history.redoStack.length).toBe(1);
  });

  it('should emit selectionChange on mouseup and keyup', () => {
    const editor = new Editor({ selector: '#test-textarea' });
    let emitted = false;

    editor.on('selectionChange', () => {
      emitted = true;
    });

    const mouseEvent = new MouseEvent('mouseup');
    editor.editableArea.dispatchEvent(mouseEvent);

    expect(emitted).toBe(true);

    emitted = false;
    const keyEvent = new KeyboardEvent('keyup', { key: 'a' });
    editor.editableArea.dispatchEvent(keyEvent);

    expect(emitted).toBe(true);

    // Should ignore modifier keys
    emitted = false;
    const modEvent = new KeyboardEvent('keyup', { key: 'Shift' });
    editor.editableArea.dispatchEvent(modEvent);

    expect(emitted).toBe(false);
  });

  it('should intercept native paste event and bypass default history pollution', () => {
    const editor = new Editor({ selector: '#test-textarea' });

    let isPrevented = false;
    let pastedText = null;
    let insertedCmd = null;

    document.execCommand = (cmd, showUI, value) => {
      insertedCmd = cmd;
      pastedText = value;
    };

    const pasteEvent = new Event('paste');
    pasteEvent.clipboardData = {
      getData: (type) => {
        if (type === 'text/html') return '<p>Sanitized Paste <script>alert(1)</script></p>';
        return 'Sanitized Paste';
      }
    };

    // Monitor prevent default
    const originalPreventDefault = pasteEvent.preventDefault;
    pasteEvent.preventDefault = () => {
      isPrevented = true;
      originalPreventDefault.call(pasteEvent);
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    expect(isPrevented).toBe(true);
    expect(insertedCmd).toBe('insertHTML');
    expect(pastedText).toBe('<p>Sanitized Paste alert(1)</p>');
  });
});
