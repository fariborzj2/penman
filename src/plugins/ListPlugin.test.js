/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { setupListPlugin } from './ListPlugin.js';

describe('ListPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({ selector: '#editor' });
    setupListPlugin(editor);
  });

  it('should register list-related buttons', () => {
    expect(editor.ui.registry.buttons['bullist']).toBeDefined();
    expect(editor.ui.registry.buttons['numlist']).toBeDefined();
    expect(editor.ui.registry.buttons['indentlist']).toBeDefined();
    expect(editor.ui.registry.buttons['outdentlist']).toBeDefined();
  });

  it('should create unordered list when bullist button is clicked', () => {
    let executedCmd = null;
    document.execCommand = vi.fn((cmd) => { executedCmd = cmd; });

    editor.ui.registry.buttons['bullist'].onAction();

    expect(executedCmd).toBe('insertUnorderedList');
  });

  it('should create ordered list when numlist button is clicked', () => {
    let executedCmd = null;
    document.execCommand = vi.fn((cmd) => { executedCmd = cmd; });

    editor.ui.registry.buttons['numlist'].onAction();

    expect(executedCmd).toBe('insertOrderedList');
  });

  describe('Indent / Outdent', () => {
    beforeEach(() => {
      editor.setContent('<ul><li>Item 1</li><li>Item 2</li></ul>');
    });

    it('should indent a list item into its previous sibling', () => {
      const li2 = editor.editableArea.querySelectorAll('li')[1];
      
      // Mock selection on Item 2
      const range = document.createRange();
      range.selectNodeContents(li2);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      editor.commands.execute('indentList');

      const html = editor.getContent();
      expect(html).toContain('<li>Item 1<ul><li>Item 2</li></ul></li>');
    });

    it('should not indent the first list item', () => {
      const li1 = editor.editableArea.querySelectorAll('li')[0];
      
      const range = document.createRange();
      range.selectNodeContents(li1);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      editor.commands.execute('indentList');

      const html = editor.getContent();
      expect(html).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
    });

    it('should outdent a nested list item', () => {
      editor.setContent('<ul><li>Item 1<ul><li>Item 2</li></ul></li></ul>');
      const li2 = editor.editableArea.querySelectorAll('li')[1];

      const range = document.createRange();
      range.selectNodeContents(li2);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      editor.commands.execute('outdentList');

      const html = editor.getContent();
      expect(html).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
    });

    it('should convert a top-level list item to a paragraph on outdent', () => {
      const li1 = editor.editableArea.querySelectorAll('li')[0];

      const range = document.createRange();
      range.selectNodeContents(li1);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      editor.commands.execute('outdentList');

      const html = editor.getContent();
      expect(html).toBe('<p>Item 1</p><ul><li>Item 2</li></ul>');
    });

    it('should preserve selection after indenting', () => {
      const li2 = editor.editableArea.querySelectorAll('li')[1];
      const textNode = li2.firstChild;

      const range = document.createRange();
      range.setStart(textNode, 2); // after "It"
      range.setEnd(textNode, 4);   // after "em "
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      editor.commands.execute('indentList');

      const sel = window.getSelection();
      expect(sel.rangeCount).toBe(1);
      const restoredRange = sel.getRangeAt(0);
      
      expect(restoredRange.startContainer.textContent).toBe('Item 2');
      expect(restoredRange.startOffset).toBe(2);
      expect(restoredRange.endOffset).toBe(4);
    });
  });
});
