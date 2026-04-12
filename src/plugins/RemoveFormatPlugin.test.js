/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import penman from '../index.js';

describe('RemoveFormatPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = penman.init({ selector: '#editor', plugins: 'removeformat', toolbar: 'removeformat' });
  });

  it('should register CLEAR_FORMATTING command', () => {
    expect(editor.commands.commands['CLEAR_FORMATTING']).toBeDefined();
  });

  it('should add removeformat button to the registry', () => {
    expect(editor.ui.registry.buttons['removeformat']).toBeDefined();
  });
});
