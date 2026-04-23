/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FloatingUI } from './FloatingUI.js';

describe('FloatingUI', () => {
  let floatingUI;
  let fakeEditor;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    fakeEditor = {
      container: container,
    };
    container.getBoundingClientRect = () => ({ top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 });
    floatingUI = new FloatingUI(fakeEditor);
  });

  afterEach(() => {
    floatingUI.destroy();
    document.body.removeChild(container);
  });

  it('should mount with content', () => {
    floatingUI.mount('<button>Test</button>');
    expect(floatingUI.element).not.toBeNull();
    expect(floatingUI.element.innerHTML).toBe('<button>Test</button>');
    expect(floatingUI.element.style.display).toBe('none'); // Initially hidden before update
    expect(floatingUI.isVisible).toBe(true);
  });

  it('should hide and show', () => {
    floatingUI.mount('<p>A</p>');
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 20, left: 10, right: 20, width: 10, height: 10 });
    floatingUI.setAnchor(anchor);

    expect(floatingUI.element.style.display).toBe('block');

    floatingUI.hide();
    expect(floatingUI.element.style.display).toBe('none');
    expect(floatingUI.isVisible).toBe(false);

    floatingUI.show();
    expect(floatingUI.element.style.display).toBe('block');
    expect(floatingUI.isVisible).toBe(true);
  });

  it('should destroy and remove from DOM', () => {
    floatingUI.mount('<p>A</p>');
    const el = floatingUI.element;
    expect(container.contains(el)).toBe(true);

    floatingUI.destroy();
    expect(container.contains(el)).toBe(false);
    expect(floatingUI.element).toBeNull();
  });
});
