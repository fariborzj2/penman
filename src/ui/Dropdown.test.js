/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Dropdown } from './Dropdown.js';

describe('Dropdown', () => {
  let dropdown;

  beforeEach(() => {
    dropdown = new Dropdown({
      title: 'Test Dropdown',
      content: '<div class="test-item">Item 1</div>',
      onOpen: vi.fn(),
      onClose: vi.fn()
    });
    document.body.appendChild(dropdown.element);
  });

  afterEach(() => {
    dropdown.destroy();
    document.body.innerHTML = '';
  });

  it('should render trigger button and panel correctly', () => {
    expect(dropdown.buttonElement.title).toBe('Test Dropdown');
    expect(dropdown.panelElement.style.display).toBe('none');
    expect(dropdown.panelElement.innerHTML).toBe('<div class="test-item">Item 1</div>');
  });

  it('should open and close the dropdown on toggle', () => {
    dropdown.toggle();

    expect(dropdown.isOpen).toBe(true);
    expect(dropdown.panelElement.style.display).toBe('block');
    expect(dropdown.buttonElement.classList.contains('penman-btn-active')).toBe(true);
    expect(dropdown.options.onOpen).toHaveBeenCalledWith(dropdown);

    dropdown.toggle();

    expect(dropdown.isOpen).toBe(false);
    expect(dropdown.panelElement.style.display).toBe('none');
    expect(dropdown.buttonElement.classList.contains('penman-btn-active')).toBe(false);
    expect(dropdown.options.onClose).toHaveBeenCalledWith(dropdown);
  });

  it('should close when clicking outside', async () => {
    dropdown.open();

    expect(dropdown.isOpen).toBe(true);

    // Need to wait slightly because outside click handler is bound with a setTimeout(..., 0)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Simulate click on body
    document.body.click();

    expect(dropdown.isOpen).toBe(false);
    expect(dropdown.options.onClose).toHaveBeenCalledWith(dropdown);
  });

  it('should NOT close when clicking inside the dropdown', async () => {
    dropdown.open();

    await new Promise(resolve => setTimeout(resolve, 10));

    // Simulate click inside panel
    dropdown.panelElement.click();

    expect(dropdown.isOpen).toBe(true);
  });
});
