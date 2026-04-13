/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from './Editor.js';

describe('Editor Table Breakout', () => {
  let editor;
  let textarea;

  beforeEach(() => {
    document.body.innerHTML = '';
    textarea = document.createElement('textarea');
    textarea.id = 'editor';
    document.body.appendChild(textarea);

    // Initialize editor with a table at the very top
    textarea.value = `<table><tbody><tr><td data-cell-id="1">Cell</td></tr></tbody></table>`;
    editor = new Editor({ selector: '#editor' });
  });

  it('should break out of table and insert paragraph on Enter at start of first cell', () => {
    const td = editor.editableArea.querySelector('td');

    // Position cursor at beginning of cell
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(td.firstChild, 0); // before 'C' in 'Cell'
    range.collapse(true);
    sel.addRange(range);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    editor.editableArea.dispatchEvent(enterEvent);

    // Verify a paragraph was inserted BEFORE the table
    const firstChild = editor.editableArea.firstElementChild;
    expect(firstChild.tagName.toLowerCase()).toBe('p');

    const secondChild = editor.editableArea.children[1];
    expect(secondChild.tagName.toLowerCase()).toBe('table');
  });

  it('should break out of table and insert paragraph on ArrowUp at start of first cell', () => {
    const td = editor.editableArea.querySelector('td');

    // Position cursor at beginning of cell
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(td.firstChild, 0);
    range.collapse(true);
    sel.addRange(range);

    const enterEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    editor.editableArea.dispatchEvent(enterEvent);

    const firstChild = editor.editableArea.firstElementChild;
    expect(firstChild.tagName.toLowerCase()).toBe('p');
  });
});
