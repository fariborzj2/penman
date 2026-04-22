/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { setupBlockTypePlugin } from './BlockTypePlugin.js';

describe('BlockTypePlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor">Initial text</textarea>';
    editor = new Editor({
      selector: '#editor',
      plugins: ['blocktype'],
      blockTypes: [
        { name: 'Paragraph', cmd: 'p' },
        { name: 'Heading 1', cmd: 'h1' },
        { name: 'Blockquote', cmd: 'blockquote' },
        {
          name: 'Warning',
          cmd: 'div',
          class: 'warning-block',
          optionStyle: { color: 'red' }
        }
      ]
    });
  });

  afterEach(() => {
    if (editor) editor.destroy();
    document.body.innerHTML = '';
  });

  it('should register blocktype dropdown in UI registry', () => {
    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    expect(dropdownConfig).toBeDefined();
    expect(dropdownConfig.text).toBe('Paragraph');
    expect(typeof dropdownConfig.render).toBe('function');
  });

  it('should render dropdown content with search and list', () => {
    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();

    expect(content.querySelector('.penman-blocktype-search')).not.toBeNull();
    expect(content.querySelector('.penman-blocktype-list')).not.toBeNull();

    // Check items are rendered
    const items = content.querySelectorAll('.penman-blocktype-item');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].textContent).toBe('Paragraph');
  });

  it('should apply optionStyle to the item container', () => {
    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();
    
    // Find Warning block
    const items = content.querySelectorAll('.penman-blocktype-item');
    const warningItem = Array.from(items).find(i => i.textContent === 'Warning');
    expect(warningItem).toBeDefined();
    
    // Check color applied to the item container
    expect(warningItem.style.color).toBe('red');
  });

  it('should execute SET_BLOCK_TYPE when an item is clicked', () => {
    let executedCmd = null;
    let executedVal = null;
    const originalExec = editor.execCommand.bind(editor);
    editor.execCommand = (cmd, val) => {
       executedCmd = cmd;
       executedVal = val;
       return originalExec(cmd, val);
    };

    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();

    const items = content.querySelectorAll('.penman-blocktype-item');

    // Click on Heading 1
    const heading1Item = Array.from(items).find(i => i.textContent === 'Heading 1');
    heading1Item.dispatchEvent(new Event('click'));

    expect(executedCmd).toBe('SET_BLOCK_TYPE');
    expect(executedVal.cmd).toBe('h1');
    expect(executedVal.name).toBe('Heading 1');
  });

  it('should wrap multiple blocks correctly when a wrapper command is used', () => {
    editor.editableArea.innerHTML = '<p>A</p><ul><li>B</li></ul><p>C</p>';

    const range = document.createRange();
    range.setStart(editor.editableArea.children[0].firstChild, 0); // Start of <p>A</p>
    range.setEnd(editor.editableArea.children[1].firstChild, 1); // End of <li>B</li>

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    editor.execCommand('SET_BLOCK_TYPE', { cmd: 'blockquote' });

    // Using string matching since jsdom normalizes attributes weirdly
    expect(editor.editableArea.innerHTML.replace(/\s+/g, '')).toContain('<blockquote><p>A</p><ul><li>B</li></ul></blockquote>');
    expect(editor.editableArea.innerHTML.replace(/\s+/g, '')).toContain('<p>C</p>');
  });
});
