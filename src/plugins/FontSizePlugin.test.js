/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import penman from '../index.js';

describe('FontSizePlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = penman.init({ selector: '#editor', plugins: 'fontsize', toolbar: 'fontsize' });
  });

  it('should register SET_FONT_SIZE command', () => {
    expect(editor.commands.commands['SET_FONT_SIZE']).toBeDefined();
  });

  it('should add fontsize dropdown to the registry', () => {
    expect(editor.ui.registry.dropdowns['fontsize']).toBeDefined();
  });
});
