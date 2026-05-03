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

  it('should format complex nested lists and task lists', () => {
    const pasteEvent = {
      text: '* Item 1\n  * Nested Item\n* [x] Checked Task\n* [ ] Unchecked Task',
      html: '',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    };
    editor.insertContent = vi.fn();
    editor.emit('beforePaste', pasteEvent);

    const insertedHtml = editor.insertContent.mock.calls[0][0];
    expect(insertedHtml).toContain('<ul><li>Item 1</li><ul><li>Nested Item</li></ul><li><input type="checkbox" disabled checked> Checked Task</li><li><input type="checkbox" disabled > Unchecked Task</li></ul>');
  });

  it('should format code blocks and inline code', () => {
    const pasteEvent = {
      text: 'Here is some `inline code`.\n\n```javascript\nconst a = 1;\n```',
      html: '',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    };
    editor.insertContent = vi.fn();
    editor.emit('beforePaste', pasteEvent);

    const insertedHtml = editor.insertContent.mock.calls[0][0];
    expect(insertedHtml).toContain('<code>inline code</code>');
    expect(insertedHtml).toContain('<pre><code class="language-javascript" data-language="javascript">const a = 1;</code></pre>');
  });

  it('should process emojis, escaping, and links', () => {
    const pasteEvent = {
      text: 'Smile :smile:, Escaped \\*Not Italic\\*, Link [Google](https://google.com)',
      html: '',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    };
    editor.insertContent = vi.fn();
    editor.emit('beforePaste', pasteEvent);

    const insertedHtml = editor.insertContent.mock.calls[0][0];
    expect(insertedHtml).toContain('Smile 😄');
    expect(insertedHtml).toContain('Escaped <em>Not Italic</em>');
    expect(insertedHtml).toContain('<a href="https://google.com">Google</a>');
  });

  it('should process admonitions and footnotes', () => {
    const pasteEvent = {
      text: '[!TIP] A helpful tip.\n\nHere is a footnote[^1]\n\n[^1]: Footnote text',
      html: '',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    };
    editor.insertContent = vi.fn();
    editor.emit('beforePaste', pasteEvent);

    const insertedHtml = editor.insertContent.mock.calls[0][0];
    expect(insertedHtml).toContain('<div class="penman-admonition penman-admonition-tip"><strong>TIP:</strong>  A helpful tip.</div>');
    expect(insertedHtml).toContain('<sup class="penman-footnote-ref"><a href="#fn-1">[1]</a></sup>');
    expect(insertedHtml).toContain('<div class="penman-footnote" id="fn-1"><sup>1</sup> Footnote text</div>');
  });

  it('should collapse multiple newlines', () => {
    const pasteEvent = {
      text: 'Line 1 **bold**\n\n\n\nLine 2',
      html: '',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    };
    editor.insertContent = vi.fn();
    editor.emit('beforePaste', pasteEvent);

    const insertedHtml = editor.insertContent.mock.calls[0][0];
    expect(insertedHtml).toContain('<p>Line 1 <strong>bold</strong></p><p><br></p><p>Line 2</p>');
    expect(insertedHtml).not.toContain('<p><br></p><p><br></p>');
  });
});
