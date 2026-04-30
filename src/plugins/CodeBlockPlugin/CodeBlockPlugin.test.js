/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin, tokenizeJavaScript, patchDOM } from './CodeBlockPlugin.js';

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

  it('tokenizer matches keywords, strings, numbers, and comments', () => {
      const code = `function test() { const x = "hello"; // comment \n return 10; }`;
      const tokens = tokenizeJavaScript(code);
      
      expect(tokens).toEqual(expect.arrayContaining([
          expect.objectContaining({ type: 'keyword', value: 'function' }),
          expect.objectContaining({ type: 'keyword', value: 'const' }),
          expect.objectContaining({ type: 'string', value: '"hello"' }),
          expect.objectContaining({ type: 'comment', value: '// comment ' }),
          expect.objectContaining({ type: 'number', value: '10' })
      ]));
  });

  it('patchDOM applies tokens correctly', () => {
      const codeNode = document.createElement('code');
      const tokens = [
          { type: 'keyword', value: 'const' },
          { type: 'text', value: ' x = ' },
          { type: 'number', value: '10' }
      ];
      
      patchDOM(codeNode, tokens);
      
      expect(codeNode.childNodes.length).toBe(3);
      expect(codeNode.childNodes[0].tagName).toBe('SPAN');
      expect(codeNode.childNodes[0].className).toBe('penman-token-keyword');
      expect(codeNode.childNodes[0].textContent).toBe('const');
      
      expect(codeNode.childNodes[1].nodeType).toBe(3);
      expect(codeNode.childNodes[1].nodeValue).toBe(' x = ');
      
      expect(codeNode.childNodes[2].tagName).toBe('SPAN');
      expect(codeNode.childNodes[2].className).toBe('penman-token-number');
      expect(codeNode.childNodes[2].textContent).toBe('10');
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
    expect(html).toContain('penman-token-keyword');
    expect(html).toContain('penman-token-number');
    expect(html).toContain('const');
    expect(html).toContain('x');
    expect(html).toContain('10');
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

});
