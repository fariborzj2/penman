// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from './Editor.js';

describe('Magic Paste as Link', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="test-textarea">Initial Text</textarea>';
    editor = new Editor({ selector: '#test-textarea' });
    // Mock execCommand
    document.execCommand = vi.fn();
  });

  it('should identify valid URLs correctly', () => {
    expect(editor._isUrl('https://google.com')).toBe(true);
    expect(editor._isUrl('http://google.com')).toBe(true);
    expect(editor._isUrl('www.google.com')).toBe(true);
    expect(editor._isUrl('  https://google.com  ')).toBe(true);
    expect(editor._isUrl('not a url')).toBe(false);
    expect(editor._isUrl('google.com')).toBe(false); // We strictly require http/https or www
  });

  it('should wrap selected text in a link when a URL is pasted', () => {
    // Simulate text selection
    const range = document.createRange();
    const textNode = document.createTextNode('selected text');
    editor.editableArea.innerHTML = '';
    editor.editableArea.appendChild(textNode);

    const sel = window.getSelection();
    sel.removeAllRanges();
    range.selectNodeContents(textNode);
    sel.addRange(range);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      getData: (type) => {
        if (type === 'text/plain') return 'https://example.com';
        return '';
      }
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    expect(document.execCommand).toHaveBeenCalledWith('createLink', false, 'https://example.com');
  });

  it('should prepend http:// to www. URLs when pasting over text', () => {
    // Simulate text selection
    const range = document.createRange();
    const textNode = document.createTextNode('selected text');
    editor.editableArea.innerHTML = '';
    editor.editableArea.appendChild(textNode);

    const sel = window.getSelection();
    sel.removeAllRanges();
    range.selectNodeContents(textNode);
    sel.addRange(range);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      getData: (type) => {
        if (type === 'text/plain') return 'www.example.com';
        return '';
      }
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    expect(document.execCommand).toHaveBeenCalledWith('createLink', false, 'http://www.example.com');
  });

  it('should wrap a selected block node in a link when a URL is pasted', () => {
    const figure = document.createElement('figure');
    figure.className = 'penman-image';
    figure.innerHTML = '<img src="test.jpg">';
    editor.editableArea.innerHTML = '';
    editor.editableArea.appendChild(figure);

    // Manually select the node
    editor.selection.selectNode(figure);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      getData: (type) => {
        if (type === 'text/plain') return 'https://example.com';
        return '';
      }
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    const link = editor.editableArea.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/'); // JSDOM normalizes href
    expect(link.firstChild).toBe(figure);
  });

  it('should update an existing link if a block node already inside a link is selected', () => {
    const link = document.createElement('a');
    link.href = 'https://old.com';
    const figure = document.createElement('figure');
    figure.className = 'penman-image';
    link.appendChild(figure);
    editor.editableArea.innerHTML = '';
    editor.editableArea.appendChild(link);

    // Manually select the node
    editor.selection.selectNode(figure);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      getData: (type) => {
        if (type === 'text/plain') return 'https://new.com';
        return '';
      }
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    expect(link.href).toBe('https://new.com/');
    expect(link.firstChild).toBe(figure);
    expect(editor.editableArea.querySelectorAll('a').length).toBe(1);
  });

  it('should proceed with normal paste if clipboard is not a URL', () => {
    // Simulate text selection
    const range = document.createRange();
    const textNode = document.createTextNode('selected text');
    editor.editableArea.innerHTML = '';
    editor.editableArea.appendChild(textNode);

    const sel = window.getSelection();
    sel.removeAllRanges();
    range.selectNodeContents(textNode);
    sel.addRange(range);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      getData: (type) => {
        if (type === 'text/plain') return 'just some text';
        return '';
      }
    };

    editor.editableArea.dispatchEvent(pasteEvent);

    // Normal paste uses insertHTML
    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.any(String));
    expect(document.execCommand).not.toHaveBeenCalledWith('createLink', expect.anything(), expect.anything());
  });
});
