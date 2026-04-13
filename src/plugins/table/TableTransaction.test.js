/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableTransaction } from './TableTransaction.js';

describe('TableTransaction', () => {
  let editorMock;
  let transaction;
  let tableNode;

  beforeEach(() => {
    editorMock = {
      emit: vi.fn(),
      getContent: vi.fn(),
      history: { pushImmediate: vi.fn() },
      editableArea: document.createElement('div')
    };

    tableNode = document.createElement('table');
    tableNode.setAttribute('data-table-id', 't1');
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

    transaction = new TableTransaction(editorMock, 't1');
  });

  it('should logically merge cells securely via Exclusion and Descriptors', () => {
    transaction.begin();
    expect(transaction.mergeCells(['1', '2'])).toBe(true);
    transaction.commit();

    const activeTable = editorMock.editableArea.querySelector('table');
    const tdsRow1 = activeTable.querySelectorAll('tr')[0].querySelectorAll('td');
    // One td was removed, so there should be 1 td left with colspan=2
    expect(tdsRow1.length).toBe(1);

    const anchor = activeTable.querySelector('[data-cell-id="1"]');
    expect(anchor.getAttribute('colspan')).toBe('2');

    // The absorbed cell should no longer be in the DOM
    const absorbed = activeTable.querySelector('[data-cell-id="2"]');
    expect(absorbed).toBeNull();
  });

  it('should reject invalid merge rectangles', () => {
    transaction.begin();
    expect(transaction.mergeCells(['1', '4'])).toBe(false);
  });

  it('should deterministic split via Descriptor without DOM scanning', () => {
     transaction.begin();
     transaction.mergeCells(['1', '2', '3', '4']);
     transaction.commit();

     const splitTx = new TableTransaction(editorMock, 't1');
     splitTx.begin();
     expect(splitTx.splitCell('1')).toBe(true);
     splitTx.commit();

     const activeTable2 = editorMock.editableArea.querySelector('table');
     const anchor = activeTable2.querySelector('[data-cell-id="1"]');
     expect(anchor.getAttribute('colspan')).toBeNull();

     const absorbed = activeTable2.querySelector('[data-cell-id="4"]');
     expect(absorbed).not.toBeNull();
  });

  it('should add row correctly', () => {
      transaction.begin();
      expect(transaction.addRow('1', 'after')).toBe(true);
      transaction.commit();

      const table = editorMock.editableArea.querySelector('table');
      expect(table.querySelectorAll('tr').length).toBe(3);
      // New row should be inserted in middle (index 1)
      const newRowCells = table.querySelectorAll('tr')[1].querySelectorAll('td');
      expect(newRowCells.length).toBe(2);
      expect(newRowCells[0].getAttribute('data-cell-id')).toBeDefined();
      expect(newRowCells[0].innerHTML).toBe('<br>');
  });

  it('should remove row correctly', () => {
      transaction.begin();
      expect(transaction.removeRow('3')).toBe(true); // remove second row
      transaction.commit();

      const table = editorMock.editableArea.querySelector('table');
      expect(table.querySelectorAll('tr').length).toBe(1);
      expect(table.querySelector('[data-cell-id="1"]')).toBeDefined();
      expect(table.querySelector('[data-cell-id="3"]')).toBeNull();
  });

  it('should add column correctly', () => {
      transaction.begin();
      expect(transaction.addColumn('1', 'after')).toBe(true);
      transaction.commit();

      const table = editorMock.editableArea.querySelector('table');
      const rows = table.querySelectorAll('tr');
      expect(rows[0].querySelectorAll('td').length).toBe(3);
      expect(rows[1].querySelectorAll('td').length).toBe(3);
  });

  it('should remove column correctly', () => {
      transaction.begin();
      expect(transaction.removeColumn('2')).toBe(true);
      transaction.commit();

      const table = editorMock.editableArea.querySelector('table');
      const rows = table.querySelectorAll('tr');
      expect(rows[0].querySelectorAll('td').length).toBe(1);
      expect(rows[1].querySelectorAll('td').length).toBe(1);
      expect(table.querySelector('[data-cell-id="2"]')).toBeNull();
  });

  it('should delete table completely', () => {
      transaction.begin();
      expect(transaction.deleteTable()).toBe(true);
      transaction.commit();

      expect(editorMock.editableArea.querySelector('table')).toBeNull();
      expect(editorMock.editableArea.querySelector('p')).not.toBeNull();
  });
});
