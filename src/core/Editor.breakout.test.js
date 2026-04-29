/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from './Editor.js';

describe('Editor Aggressive Block Breakout', () => {
  let editor;
  let textarea;

  beforeEach(() => {
    document.body.innerHTML = '';
    textarea = document.createElement('textarea');
    textarea.id = 'editor';
    document.body.appendChild(textarea);
    textarea.value = '<p>Initial content</p>';
    editor = new Editor({ selector: '#editor' });

    // Mock platform for isMac check
    Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
        configurable: true
    });
  });

  it('should break out of blockquote completely on Cmd+Enter', () => {
    // <blockquote><p id="quote-p">Quote content</p></blockquote>
    editor.setContent('<blockquote><p id="quote-p">Quote content</p></blockquote>');
    const p = editor.editableArea.querySelector('#quote-p');

    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p.firstChild, 5); // inside "Quote"
    range.collapse(true);
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true
    });
    editor.editableArea.dispatchEvent(event);

    // Aggressive breakout should result in 2 top-level elements: blockquote and a new P
    const children = editor.editableArea.children;
    expect(children.length).toBe(2);
    expect(children[0].tagName.toLowerCase()).toBe('blockquote');
    expect(children[1].tagName.toLowerCase()).toBe('p');
    expect(children[1].innerHTML).toBe('<br>');

    // Verify selection is in new paragraph
    const newSel = window.getSelection();
    if (newSel.anchorNode.nodeType === 3) {
        expect(newSel.anchorNode.parentNode).toBe(children[1]);
    } else {
        expect(newSel.anchorNode).toBe(children[1]);
    }
  });

  it('should break out of pre/code block on Ctrl+Enter', () => {
    // Mock Windows platform
    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

    editor.setContent('<pre><code>code line</code></pre>');
    const code = editor.editableArea.querySelector('code');

    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(code.firstChild, 4);
    range.collapse(true);
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true
    });
    editor.editableArea.dispatchEvent(event);

    const children = editor.editableArea.children;
    expect(children.length).toBe(2);
    expect(children[0].tagName.toLowerCase()).toBe('pre');
    expect(children[1].tagName.toLowerCase()).toBe('p');
  });

  it('should break out of multi-level nested structure in one go', () => {
    // <div class="level-1"><div class="level-2"><p id="deep-p">Nested content</p></div></div>
    editor.setContent('<div class="level-1"><div class="level-2"><p id="deep-p">Nested content</p></div></div>');

    const p = editor.editableArea.querySelector('#deep-p');
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p.firstChild, 0);
    range.collapse(true);
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true
    });
    editor.editableArea.dispatchEvent(event);

    // Should insert AFTER the top-most block (.level-1)
    const children = editor.editableArea.children;
    expect(children.length).toBe(2);
    expect(children[0].className).toBe('level-1');
    expect(children[1].tagName.toLowerCase()).toBe('p');
  });

  it('should handle contextual edge navigation vs aggressive breakout in nested tables', () => {
    // Structure: <blockquote><table><tr><td><p id="table-p">Text</p></td></tr></table></blockquote>
    editor.setContent('<blockquote><table id="nested-table"><tbody><tr><td><p id="table-p">Text</p></td></tr></tbody></table></blockquote>');
    const p = editor.editableArea.querySelector('#table-p');

    // Position at the very end of the paragraph/cell
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p.firstChild, 4);
    range.collapse(true);
    sel.addRange(range);

    // 1. Plain Enter: should stay within blockquote (contextual exit from table)
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true
    });
    editor.editableArea.dispatchEvent(enterEvent);

    const blockquote = editor.editableArea.querySelector('blockquote');
    expect(blockquote.children.length).toBe(2);
    expect(blockquote.children[1].tagName.toLowerCase()).toBe('p'); // New P inside blockquote

    // 2. Cmd+Enter: should break out of EVERYTHING (Aggressive)
    // Update selection to the newly created P inside blockquote
    const p2 = blockquote.children[1];
    const sel2 = window.getSelection();
    sel2.removeAllRanges();
    const range2 = document.createRange();
    range2.setStart(p2.firstChild, 0);
    range2.collapse(true);
    sel2.addRange(range2);

    const cmdEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true
    });
    editor.editableArea.dispatchEvent(cmdEnterEvent);

    // Results in: <blockquote>...</blockquote> <p>...</p>
    const children = editor.editableArea.children;
    expect(children.length).toBe(2);
    expect(children[0].tagName.toLowerCase()).toBe('blockquote');
    expect(children[1].tagName.toLowerCase()).toBe('p');
  });

  it('should handle breakout when already at root level (just like Enter)', () => {
    editor.setContent('<p id="root-p">Text</p>');
    const p = editor.editableArea.querySelector('#root-p');

    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p.firstChild, 2);
    range.collapse(true);
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true
    });
    editor.editableArea.dispatchEvent(event);

    const children = editor.editableArea.children;
    expect(children.length).toBe(2);
    expect(children[0].id).toBe('root-p');
    expect(children[1].tagName.toLowerCase()).toBe('p');
  });
});
