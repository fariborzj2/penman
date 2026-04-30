/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin', () => {
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
    vi.restoreAllMocks();
  });

  it('should register codeblock button', () => {
    expect(editor.ui.registry.buttons['codeblock']).toBeDefined();
  });

  it('should create a code block on execute and apply highlighting', () => {
    editor.setContent('<p>const x = 10;</p>');
    const p = editor.editableArea.querySelector('p');
    
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.commands.execute('INSERT_CODEBLOCK');

    const html = editor.getContent();
    expect(html).toContain('<pre');
    expect(html).toContain('<code');
    // The content might be wrapped in hljs spans, so we check for the presence of text parts
    expect(html).toContain('const');
    expect(html).toContain('x');
    expect(html).toContain('10');
    expect(html).toContain('dir="ltr"');
  });

  it('should revert a code block to paragraph on second execute', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr">const x = 10;</code></pre>');
    const code = editor.editableArea.querySelector('code');
    
    const range = document.createRange();
    range.selectNodeContents(code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.commands.execute('INSERT_CODEBLOCK');

    const html = editor.getContent();
    expect(html).toContain('<p>');
    expect(html).toContain('const x = 10;');
    expect(html).not.toContain('<pre');
    expect(html).not.toContain('<code');
  });

  it('should handle Enter with auto-indent', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr">  line1</code></pre>');
    const code = editor.editableArea.querySelector('code');
    
    const range = document.createRange();
    range.selectNodeContents(code);
    range.collapse(false); // end of line1
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    editor.editableArea.dispatchEvent(enterEvent);

    // It should have inserted \n and 2 spaces
    expect(code.textContent).toContain('  line1\n  ');
  });

  it('should handle Tab by inserting 2 spaces', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr"></code></pre>');
    const code = editor.editableArea.querySelector('code');

    const range = document.createRange();
    range.selectNodeContents(code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    editor.editableArea.dispatchEvent(tabEvent);

    expect(code.textContent).toBe('  ');
  });

  it('should preserve syntax highlighting classes through sanitizer', () => {
    const dirty = '<pre><code><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;</code></pre>';
    const sanitized = editor.sanitizer.sanitize(dirty);

    expect(sanitized).toContain('hljs-keyword');
    expect(sanitized).toContain('hljs-number');
    expect(sanitized).toContain('<pre');
    expect(sanitized).toContain('<code');
  });
});
