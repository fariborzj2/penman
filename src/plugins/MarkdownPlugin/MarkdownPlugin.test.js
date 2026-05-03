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
});
