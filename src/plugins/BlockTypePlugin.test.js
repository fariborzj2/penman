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
      plugins: ['blocktype']
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

    // Check default items are rendered (Paragraph, H1-H6, Blockquote)
    const items = content.querySelectorAll('.penman-blocktype-item');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].textContent).toBe('Paragraph');
  });

  it('should filter items based on search input', () => {
    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();

    const searchInput = content.querySelector('.penman-blocktype-search');

    // Type "Heading 1"
    searchInput.value = 'Heading 1';
    searchInput.dispatchEvent(new Event('input'));

    const items = content.querySelectorAll('.penman-blocktype-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Heading 1');
  });

  it('should execute formatBlock when an item is clicked', () => {
    // Spy on editor's execCommand
    const execCommandSpy = vi.spyOn(editor, 'execCommand');

    const dropdownConfig = editor.ui.registry.dropdowns['blocktype'];
    const content = dropdownConfig.render();

    const items = content.querySelectorAll('.penman-blocktype-item');

    // Click on Heading 1
    const heading1Item = Array.from(items).find(i => i.textContent === 'Heading 1');
    heading1Item.dispatchEvent(new Event('click'));

    expect(execCommandSpy).toHaveBeenCalledWith('formatBlock', 'h1');
  });
});
