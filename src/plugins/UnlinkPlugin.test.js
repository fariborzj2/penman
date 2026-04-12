/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import penman from '../index.js';

describe('UnlinkPlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = penman.init({ selector: '#editor', plugins: 'unlink', toolbar: 'unlink' });
  });

  it('should register REMOVE_LINK command', () => {
    expect(editor.commands.commands['REMOVE_LINK']).toBeDefined();
  });

  it('should add unlink button to the registry', () => {
    expect(editor.ui.registry.buttons['unlink']).toBeDefined();
  });
});
