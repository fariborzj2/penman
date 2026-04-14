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

    // Mock execCommand to avoid actual browser document manipulation side-effects during some tests
    document.execCommand = vi.fn();
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
    const execCommandSpy = vi.spyOn(editor, 'execCommand');

    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();

    const items = content.querySelectorAll('.penman-blocktype-item');

    // Click on Heading 1
    const heading1Item = Array.from(items).find(i => i.textContent === 'Heading 1');
    heading1Item.dispatchEvent(new Event('click'));

    expect(execCommandSpy).toHaveBeenCalledWith('SET_BLOCK_TYPE', expect.objectContaining({ cmd: 'h1', name: 'Heading 1' }));
  });
});
