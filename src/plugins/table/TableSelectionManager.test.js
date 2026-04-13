/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableSelectionManager } from './TableSelectionManager.js';

describe('TableSelectionManager', () => {
  let editorMock;
  let tableSelectionManager;
  let tableNode;

  beforeEach(() => {
    editorMock = {
      emit: vi.fn(),
      getContent: vi.fn(),
      history: { pushImmediate: vi.fn() },
      editableArea: document.createElement('div')
    };

    tableSelectionManager = new TableSelectionManager(editorMock);

    tableNode = document.createElement('table');
    tableNode.innerHTML = `
      <tbody>
        <tr>
          <td data-cell-id="1">A</td>
          <td data-cell-id="2">B</td>
        </tr>
        <tr>
          <td data-cell-id="3">C</td>
          <td data-cell-id="4">D</td>
        </tr>
      </tbody>
    `;
    editorMock.editableArea.appendChild(tableNode);
    document.body.appendChild(editorMock.editableArea);
  });

  it('should select a range correctly based on adjacency', () => {
    tableSelectionManager.selectRange(tableNode, '1', '4');
    expect(tableSelectionManager.getSelectedCellIds().sort()).toEqual(['1', '2', '3', '4']);

    const cell1 = tableNode.querySelector('[data-cell-id="1"]');
    expect(cell1.classList.contains('penman-cell-selected')).toBe(true);
  });

  it('should clear selection', () => {
    tableSelectionManager.selectRange(tableNode, '1', '2');
    tableSelectionManager.clearSelection();

    expect(tableSelectionManager.getSelectedCellIds()).toEqual([]);
    const cell1 = tableNode.querySelector('[data-cell-id="1"]');
    expect(cell1.classList.contains('penman-cell-selected')).toBe(false);
  });

  it('should apply format to selected cells', () => {
    tableSelectionManager.selectRange(tableNode, '1', '2');
    tableSelectionManager.applyFormatToSelection('bold');

    const cell1 = tableNode.querySelector('[data-cell-id="1"]');
    expect(cell1.innerHTML).toContain('<strong>A</strong>');
    const cell2 = tableNode.querySelector('[data-cell-id="2"]');
    expect(cell2.innerHTML).toContain('<strong>B</strong>');
  });
});
