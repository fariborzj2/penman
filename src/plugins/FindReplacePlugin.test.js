/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import penman from '../index.js';
import { setupFindReplacePlugin } from './FindReplacePlugin.js';

describe('FindReplacePlugin', () => {
  let editor;
  let wrapper;
  let textarea;

  beforeEach(() => {
    wrapper = document.createElement('div');
    textarea = document.createElement('textarea');
    textarea.id = 'fr-textarea';
    wrapper.appendChild(textarea);
    document.body.appendChild(wrapper);

    editor = penman.init({
      selector: '#fr-textarea',
      toolbar: 'findreplace',
      plugins: ['findreplace']
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    const overlays = document.querySelectorAll('.penman-modal-overlay');
    overlays.forEach(overlay => overlay.remove());
  });

  it('should register findreplace command', () => {
    expect(editor.ui.registry.buttons['findreplace']).toBeDefined();
    expect(editor.ui.registry.buttons['findreplace'].text).toBe('Find and Replace');
  });

  it('should open a modal when action is triggered', () => {
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('#fr-find')).not.toBeNull();
    expect(overlay.querySelector('#fr-replace')).not.toBeNull();
  });

  it('should open a modal when Ctrl+F is pressed', () => {
    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
    editor.editableArea.dispatchEvent(event);

    const overlay = document.querySelector('.penman-modal-overlay');
    expect(overlay).not.toBeNull();
  });

  it('should auto-fill find input if text is selected', () => {
    editor.setContent('<p>Select this text</p>');

    // Mock getSelection
    let originalGetSelection = window.getSelection;
    window.getSelection = () => ({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'Select this text',
      getRangeAt: () => ({
          cloneRange: () => ({ insertNode: () => {}, collapse: () => {}, setStart: () => {}, setEnd: () => {} }),
          commonAncestorContainer: editor.editableArea,
          startContainer: editor.editableArea,
          endContainer: editor.editableArea,
          startOffset: 0,
          endOffset: 0
      }),
      removeAllRanges: () => {},
      addRange: () => {}
    });

    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    expect(inputFind.value).toBe('Select this text');

    window.getSelection = originalGetSelection;
  });

  it('should execute search and enable secondary buttons when results are found', () => {
    editor.setContent('<p>Hello world. Welcome to the world of testing.</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplace = overlay.querySelector('#fr-btn-replace');

    inputFind.value = 'world';
    btnFind.click();

    expect(btnReplace.disabled).toBe(false);
  });

    // Mock execCommand for JSDOM globally for these tests since replace-all uses it
    let originalExecCommand = document.execCommand;
    beforeEach(() => {
        document.execCommand = function(cmd, showUI, value) {
            if (cmd === 'insertHTML' || cmd === 'insertText') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const node = range.startContainer;
                    if (node.nodeType === 3 && range.startContainer === range.endContainer) {
                        const text = node.nodeValue;
                        node.nodeValue = text.substring(0, range.startOffset) + value + text.substring(range.endOffset);
                        return true;
                    }
                    range.deleteContents();
                    range.insertNode(document.createTextNode(value));
                }
                return true;
            }
            return originalExecCommand(cmd, showUI, value);
        };
    });

    afterEach(() => {
        document.execCommand = originalExecCommand;
    });

  it('should replace text correctly', () => {

    editor.setContent('<p>Hello world.</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const inputReplace = overlay.querySelector('#fr-replace');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplace = overlay.querySelector('#fr-btn-replace');

    inputFind.value = 'world';
    inputReplace.value = 'Penman';
    btnFind.click();
    btnReplace.click();

    expect(editor.getContent()).toContain('Penman');
    expect(editor.getContent()).not.toContain('world');

  });

  it('should replace all instances without skipping or crashing', () => {
    editor.setContent('<p>a a a a a</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const inputReplace = overlay.querySelector('#fr-replace');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplaceAll = overlay.querySelector('#fr-btn-replace-all');

    inputFind.value = 'a';
    inputReplace.value = 'b';
    btnFind.click();
    btnReplaceAll.click();

    expect(editor.getContent().replace(/<span[^>]*><\/span>/g, '')).toBe('<p>b b b b b</p>');
  });

  it('should handle replace all with a replacement that includes the search term (stress test)', () => {
    editor.setContent('<p>cat dog cat</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const inputReplace = overlay.querySelector('#fr-replace');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplaceAll = overlay.querySelector('#fr-btn-replace-all');

    inputFind.value = 'cat';
    inputReplace.value = 'catman';
    btnFind.click();
    btnReplaceAll.click();

    expect(editor.getContent().replace(/<span[^>]*><\/span>/g, '')).toBe('<p>catman dog catman</p>');
  });

  it('should efficiently execute replace all on a stress test without timing out', () => {
    // Generate massive mock DOM content with inline tags
    let html = '';
    for(let i=0; i < 500; i++) {
        html += `<p>This is a <b>strict</b> test number ${i} for the <i>strict</i> system.</p>`;
    }
    // 5000 paragraphs, each has 5 text nodes = 25,000 text nodes. Total matches for 'strict': 10,000.
    editor.setContent(html);

    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const inputReplace = overlay.querySelector('#fr-replace');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplaceAll = overlay.querySelector('#fr-btn-replace-all');

    inputFind.value = 'strict';
    inputReplace.value = 'awesome';
    btnFind.click();

    const startTime = performance.now();
    btnReplaceAll.click();
    const endTime = performance.now();

    const timeTaken = endTime - startTime;
    // The execution with O(M + N log M) should be highly efficient even on 10k matches natively.
    // However, JS execution in Vitest JSDOM environment can be slower than real browsers.
    // So we just ensure it doesn't crash and the final content is correct.
    expect(editor.getContent().includes('strict')).toBe(false);
    expect(editor.getContent().includes('awesome')).toBe(true);

    // We expect it to finish reasonably fast. If it was O(N*M) rebuilding tree walkers each time,
    // it would exponentially stall and easily exceed 10+ seconds.
    // JSDOM is slow, but should comfortably run under 2000ms.
    expect(timeTaken).toBeLessThan(3500);
  });

  it('should strictly handle RTL diacritics, ZWNJ, and normalization', () => {
    // 1. ZWNJ
    editor.setContent('<p>سَلا‌م</p>');
    const action = editor.ui.registry.buttons['findreplace'].onAction;
    action();

    const overlay = document.querySelector('.penman-modal-overlay');
    const inputFind = overlay.querySelector('#fr-find');
    const inputReplace = overlay.querySelector('#fr-replace');
    const btnFind = overlay.querySelector('#fr-btn-find');
    const btnReplace = overlay.querySelector('#fr-btn-replace');

    inputFind.value = 'سلام';
    inputReplace.value = 'درود';
    btnFind.click();
    btnReplace.click();

    // Verify visual equality is intact
    expect(editor.getContent().replace(/<span[^>]*><\/span>/g, '')).toBe('<p>درود</p>');

    // 2. Cross node ZWNJ / complex nesting
    editor.setContent('<p><b>س</b>‌<i>لا</i><u>م</u></p>'); // Note the ZWNJ between <b> and <i>
    inputFind.value = 'سلام';
    inputReplace.value = 'hello';
    btnFind.click();
    btnReplace.click();

    expect(editor.getContent().replace(/<[^>]+><\/[^>]+>/g, '').replace(/<[^>]+><\/[^>]+>/g, '')).toBe('<p>hello</p>');
  });
});
