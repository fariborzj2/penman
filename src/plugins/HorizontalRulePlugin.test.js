/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import penman from '../index.js';

describe('HorizontalRulePlugin', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = penman.init({ selector: '#editor', plugins: 'hr', toolbar: 'hr' });
  });

  it('should register INSERT_HORIZONTAL_RULE command', () => {
    expect(editor.commands.commands['INSERT_HORIZONTAL_RULE']).toBeDefined();
  });

  it('should add hr button to the registry', () => {
    expect(editor.ui.registry.buttons['hr']).toBeDefined();
  });
});
