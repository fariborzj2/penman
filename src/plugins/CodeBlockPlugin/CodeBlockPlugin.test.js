/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin', () => {
  let originalExecCommand;
  beforeEach(() => {
    originalExecCommand = document.execCommand;
    document.execCommand = vi.fn((cmd, showUI, value) => {
      if (cmd === 'formatBlock') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const newNode = document.createElement(value);
          let parent = range.startContainer;
          while (parent && parent.nodeType === 3) parent = parent.parentNode;
          if (parent && (parent.tagName.toLowerCase() === 'code' || parent.tagName.toLowerCase() === 'pre')) {
            let preNode = parent.tagName.toLowerCase() === 'code' ? parent.parentNode : parent;
            if (preNode.tagName.toLowerCase() === 'pre') {
              newNode.innerHTML = preNode.textContent;
              preNode.parentNode.replaceChild(newNode, preNode);
            }
          } else {
             newNode.appendChild(range.extractContents());
          }
          range.insertNode(newNode);
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(newNode);
          sel.addRange(newRange);
        }
      }
    });
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
  });
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('textarea');
    document.body.appendChild(container);

    editor = new Editor({
      element: container,
      plugins: []
    });

    setupCodeBlockPlugin(editor);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('should register codeblock button', () => {
    expect(editor.ui.registry.buttons['codeblock']).toBeDefined();
  });

  it('should create a code block on execute', () => {
    editor.setContent('<p>Hello World</p>');
    const p = editor.editableArea.querySelector('p');

    // Select the text inside paragraph
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.commands.execute('INSERT_CODEBLOCK');

    const html = editor.getContent();
    expect(html).toContain('<pre');
    expect(html).toContain('<code');
    expect(html).toContain('Hello World');
    expect(html).toContain('dir="ltr"');
  });

  it('should revert a code block to paragraph on second execute', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr">Hello World</code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.selectNodeContents(code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.commands.execute('INSERT_CODEBLOCK');

    const html = editor.getContent();
    expect(html).toContain('<p>Hello World</p>');
    expect(html).not.toContain('<pre');
    expect(html).not.toContain('<code');
  });

  it('should intercept paste inside code block and insert plain text', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr">Line 1</code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.selectNodeContents(code);
    range.collapse(false); // end
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Mock paste event
    const pasteEvent = new Event('paste', { bubbles: true });
    pasteEvent.clipboardData = {
        getData: (type) => {
            if (type === 'text/plain') return '\nLine 2';
            return '<p>Line 2</p>'; // Rich text which should be ignored
        }
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    const html = editor.getContent();
    expect(html).toContain('Line 1\nLine 2');
    expect(html).not.toContain('<p>Line 2</p>'); // No new block inserted
  });
});
