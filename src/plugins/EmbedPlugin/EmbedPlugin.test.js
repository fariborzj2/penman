import { describe, it, expect, beforeEach, vi } from 'vitest';
/**
 * @vitest-environment jsdom
 */
import { setupEmbedPlugin } from './EmbedPlugin.js';

describe('EmbedPlugin', () => {
  let editorMock;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor"></div>';
    editorMock = {
      editableArea: document.getElementById('editor'),
      ui: {
        registry: {
          addButton: vi.fn(),
        },
        createModal: vi.fn().mockReturnValue({
          open: vi.fn(),
          close: vi.fn(),
          element: document.createElement('div')
        })
      },
      i18n: {
        t: vi.fn((key) => key)
      },
      selection: {
        save: vi.fn(),
        restore: vi.fn(),
        clearNodeSelection: vi.fn(),
        getSelectedNode: vi.fn()
      },
      history: {
        pushImmediate: vi.fn()
      },
      emit: vi.fn(),
      getContent: vi.fn().mockReturnValue('')
    };
    
    // Polyfill for window.getSelection
    window.getSelection = vi.fn().mockReturnValue({
      rangeCount: 0,
      removeAllRanges: vi.fn(),
      addRange: vi.fn()
    });
  });

  it('should register embed button in UI', () => {
    setupEmbedPlugin(editorMock);
    
    expect(editorMock.ui.registry.addButton).toHaveBeenCalledWith('embed', expect.objectContaining({
      text: 'plugins.embed.title',
      onAction: expect.any(Function)
    }));
  });

  it('should define insertNode method on editor.embed', () => {
    setupEmbedPlugin(editorMock);
    expect(editorMock.embed).toBeDefined();
    expect(typeof editorMock.embed.insertNode).toBe('function');
  });

  it('should create figure block when insertNode is called', () => {
    setupEmbedPlugin(editorMock);
    const htmlCode = '<iframe src="https://example.com"></iframe>';
    
    editorMock.embed.insertNode(htmlCode);
    
    const figures = editorMock.editableArea.querySelectorAll('figure.penman-embed-block');
    expect(figures.length).toBe(1);
    
    const iframe = figures[0].querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toBe('https://example.com/');
  });
});
