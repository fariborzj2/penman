// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMarkdownPlugin } from './MarkdownPlugin.js';
import { EventEmitter } from '../../core/EventEmitter.js';

class MockEditor extends EventEmitter {
  constructor() {
    super();
    this.editableArea = document.createElement('div');
    document.body.appendChild(this.editableArea);

    this.history = {
      takeSnapshot: vi.fn()
    };

    this.commands = {
      execute: vi.fn()
    };
    this.execCommand = vi.fn();
  }
}

describe('MarkdownPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '';
    editor = new MockEditor();
    setupMarkdownPlugin(editor);
  });

  it('should format heading 1 when # is typed', () => {
    const p = document.createElement('p');
    p.textContent = '# ';
    editor.editableArea.appendChild(p);

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(p.firstChild, 2);
    range.setEnd(p.firstChild, 2);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.emit('keyup', { key: ' ', preventDefault: vi.fn() });

    expect(editor.history.takeSnapshot).toHaveBeenCalled();
    expect(editor.execCommand).toHaveBeenCalledWith('SET_BLOCK_TYPE', { cmd: 'h1' });
  });

  it('should format unordered list when * is typed', () => {
    const p = document.createElement('p');
    p.textContent = '* ';
    editor.editableArea.appendChild(p);

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(p.firstChild, 2);
    range.setEnd(p.firstChild, 2);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.emit('keyup', { key: ' ', preventDefault: vi.fn() });

    expect(editor.history.takeSnapshot).toHaveBeenCalled();
    expect(editor.execCommand).toHaveBeenCalledWith('insertUnorderedList');
  });

  it('should inline format bold when **text** is typed', () => {
    const p = document.createElement('p');
    p.textContent = 'This is **bold** ';
    editor.editableArea.appendChild(p);

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(p.firstChild, 17);
    range.setEnd(p.firstChild, 17);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.emit('keyup', { key: ' ', preventDefault: vi.fn() });

    expect(editor.history.takeSnapshot).toHaveBeenCalled();
    expect(editor.editableArea.innerHTML).toContain('<strong>bold</strong>');
  });

  it('should format markdown correctly on paste', () => {
    const pasteEvent = {
      text: '# Heading 1\n\nSome **bold** text and *italic* text.\n\n* Item 1\n* Item 2\n\n| Col 1 | Col 2 |\n',
      html: '',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    };

    editor.insertContent = vi.fn();

    editor.emit('beforePaste', pasteEvent);

    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(editor.insertContent).toHaveBeenCalled();

    const insertedHtml = editor.insertContent.mock.calls[0][0];

    // Check conversions
    expect(insertedHtml).toContain('<h1>Heading 1</h1>');
    expect(insertedHtml).toContain('<strong>bold</strong>');
    expect(insertedHtml).toContain('<em>italic</em>');
    expect(insertedHtml).toContain('<ul><li>Item 1</li><li>Item 2</li></ul>');
    expect(insertedHtml).toContain('<table');
  });
});
