/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Editor } from '../../core/Editor.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

describe('CodeBlockPlugin Stability', () => {
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

  it('should not add multiple newlines on repeated highlighting', async () => {
    editor.setContent('<pre dir="ltr"><code dir="ltr" data-language="javascript">const x = 1;</code></pre>');
    const code = editor.editableArea.querySelector('code');

    // Simulate typing: no newline at end
    for (let i = 0; i < 3; i++) {
        editor.editableArea.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 600));
    }
    expect(code.textContent).toBe('const x = 1;');

    // Simulate Enter at end: one newline at end
    code.textContent = 'const x = 1;\n';
    for (let i = 0; i < 3; i++) {
        editor.editableArea.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 600));
    }
    expect(code.textContent).toBe('const x = 1;\n');
  }, 10000);
});
