/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '../core/Editor.js';
import { HistoryManager } from './HistoryManager.js';

describe('HistoryManager', () => {
  let editor;
  let historyManager;
  let textarea;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    textarea = document.getElementById('editor');

    // Create a minimal fake editor behavior since we are testing HistoryManager
    editor = new Editor({ selector: '#editor' });
    historyManager = editor.history;
  });

  it('should initialize with one snapshot (initial state)', () => {
    expect(historyManager.undoStack.length).toBe(1);
    expect(historyManager.redoStack.length).toBe(0);
  });

  it('should push a new state immediately', () => {
    editor.setContent('<p>Hello</p>');
    historyManager.pushImmediate();

    expect(historyManager.undoStack.length).toBe(2);
    expect(historyManager.undoStack[1].html).toBe('<p>Hello</p>');
  });

  it('should undo to the previous state', () => {
    editor.setContent('<p>State 1</p>');
    historyManager.pushImmediate();

    editor.setContent('<p>State 2</p>');
    historyManager.pushImmediate();

    expect(historyManager.undoStack.length).toBe(3);

    historyManager.undo();

    expect(historyManager.undoStack.length).toBe(2);
    expect(historyManager.redoStack.length).toBe(1);
    expect(editor.getContent()).toBe('<p>State 1</p>');
  });

  it('should redo to the next state', () => {
    editor.setContent('<p>State 1</p>');
    historyManager.pushImmediate();

    editor.setContent('<p>State 2</p>');
    historyManager.pushImmediate();

    historyManager.undo(); // back to State 1
    historyManager.redo(); // forward to State 2

    expect(historyManager.undoStack.length).toBe(3);
    expect(historyManager.redoStack.length).toBe(0);
    expect(editor.getContent()).toBe('<p>State 2</p>');
  });

  it('should ignore duplicate consecutive states', () => {
    editor.setContent('<p>State 1</p>');
    historyManager.pushImmediate();
    historyManager.pushImmediate(); // Duplicate

    expect(historyManager.undoStack.length).toBe(2);
  });
});
