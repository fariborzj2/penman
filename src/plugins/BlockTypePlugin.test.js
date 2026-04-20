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

    // Replace execCommand to avoid actual browser document manipulation side-effects during some tests

    // removed document.execCommand mock

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
    // Spy on editor's execCommand

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
});
