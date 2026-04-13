/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { TableMenu } from './TableMenu.js';

describe('TableMenu', () => {
  it('should restore selection before inserting table', () => {
    const editorMock = {
      execCommand: vi.fn(),
      selection: {
        restore: vi.fn()
      }
    };

    const menu = new TableMenu(editorMock);

    const div = document.createElement('div');
    div.innerHTML = menu.getHTML();
    document.body.appendChild(div);

    // mock the dropdown instance
    div.closest = vi.fn().mockReturnValue({
        __dropdownInstance: { close: vi.fn() }
    });

    menu.bindEvents(div, {});

    // click a cell
    const cell = div.querySelector('.penman-grid-cell[data-row="2"][data-col="3"]');
    cell.click();

    expect(editorMock.selection.restore).toHaveBeenCalled();
    expect(editorMock.execCommand).toHaveBeenCalledWith('INSERT_TABLE', { rows: 2, cols: 3 });
  });
});
