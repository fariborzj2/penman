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
        {
          name: 'Warning',
          cmd: 'div',
          class: 'warning-block',
          optionStyle: { color: 'red' }
        }
      ]
    });

    // Provide a dummy native execCommand for jsdom compatibility so it doesn't throw.
    if (!document.execCommand) {
      document.execCommand = () => true;
    }
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
    // We need to set up a selection for formatBlock to work natively
    editor.editableArea.innerHTML = '<p>Test block type</p>';
    const p = editor.editableArea.querySelector('p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();

    const items = content.querySelectorAll('.penman-blocktype-item');

    // Click on Heading 1
    const heading1Item = Array.from(items).find(i => i.textContent === 'Heading 1');

    // Simulate what formatBlock would do in a real browser since JSDOM doesn't implement it
    document.execCommand = (cmd, showUI, value) => {
        if (cmd === 'formatBlock' && value === 'h1') {
            const h1 = document.createElement('h1');
            h1.textContent = editor.editableArea.querySelector('p').textContent;
            editor.editableArea.innerHTML = '';
            editor.editableArea.appendChild(h1);
        }
    };

    heading1Item.dispatchEvent(new Event('click'));

    // Verify it actually affected the DOM
    expect(editor.getContent()).toContain('<h1');
  });
});
