/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from './Editor.js';

describe('Editor Copy Plain Text Normalization', () => {
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('textarea');
    document.body.appendChild(container);

    editor = new Editor({
      element: container,
      plugins: []
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('should preserve newlines when copying text from blocks', () => {
    editor.setContent('<p>line1</p><p>line2</p><pre><code>let x = 1;\nlet y = 2;</code></pre>');

    const range = document.createRange();
    range.selectNodeContents(editor.editableArea);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });

    let plainTextData = '';
    copyEvent.clipboardData = {
      setData: vi.fn().mockImplementation((type, data) => {
        if (type === 'text/plain') plainTextData = data;
      })
    };

    editor.editableArea.dispatchEvent(copyEvent);

    expect(plainTextData).toContain('line1\nline2\nlet x = 1;\nlet y = 2;');
  });

  it('should ignore propping trailing BR elements in codeblocks when copying', () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript"><span class="penman-token-keyword">function</span> <span class="penman-token-plain">test() {</span><br data-penman-ui="true"><span class="penman-token-plain">  </span><span class="penman-token-keyword">return</span> <span class="penman-token-number">1</span><span class="penman-token-punctuation">;</span><br data-penman-ui="true"><span class="penman-token-punctuation">}</span><br data-penman-ui="true"></code></pre>');

    const range = document.createRange();
    range.selectNodeContents(editor.editableArea);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });

    let plainTextData = '';
    copyEvent.clipboardData = {
      setData: vi.fn().mockImplementation((type, data) => {
        if (type === 'text/plain') plainTextData = data;
      })
    };

    editor.editableArea.dispatchEvent(copyEvent);

    expect(plainTextData.trim()).toBe('function test() {\n  return 1;\n}');
  });

  it('should ignore propping trailing BR elements in pasted code with multi-span nodes when copying', () => {
    editor.setContent(`<pre dir="ltr"><code dir="ltr" data-language="javascript"><span class="penman-token-keyword">if</span> <span class="penman-token-punctuation">(</span><span class="penman-token-plain">text</span><span class="penman-token-punctuation">)</span> <span class="penman-token-punctuation">{</span><br data-penman-ui="true"><span class="penman-token-comment">// Normalize CRLF to LF</span><br data-penman-ui="true"><span class="penman-token-plain">  text </span><span class="penman-token-operator">=</span> <span class="penman-token-plain">text</span><span class="penman-token-punctuation">.</span><span class="penman-token-plain">replace</span><span class="penman-token-punctuation">(/\\n/</span><span class="penman-token-plain">g</span><span class="penman-token-punctuation">,</span> <span class="penman-token-string">"\\n"</span><span class="penman-token-punctuation">);</span><br data-penman-ui="true"><span class="penman-token-comment">// Format pasted compact code automatically</span><br data-penman-ui="true"></code></pre>`);

    const range = document.createRange();
    range.selectNodeContents(editor.editableArea);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });

    let plainTextData = '';
    copyEvent.clipboardData = {
      setData: vi.fn().mockImplementation((type, data) => {
        if (type === 'text/plain') plainTextData = data;
      })
    };

    editor.editableArea.dispatchEvent(copyEvent);

    expect(plainTextData.trim()).toBe('if (text) {\n// Normalize CRLF to LF\n  text = text.replace(/\\n/g, "\\n");\n// Format pasted compact code automatically');
  });
});
