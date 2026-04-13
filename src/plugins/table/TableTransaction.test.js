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

    // Physical node still exists!
    expect(tdsRow1.length).toBe(2);

    // Anchor properties
    const anchor = activeTable.querySelector('[data-cell-id="1"]');
    expect(anchor.getAttribute('colspan')).toBe('2');
    expect(anchor.innerHTML).toBe('A<br>B');

    // Merge Descriptor exists
    expect(anchor.getAttribute('data-merge-descriptor')).toBe('["2"]');

    // Absorbed cell properties
    const absorbed = activeTable.querySelector('[data-cell-id="2"]');
    expect(absorbed.getAttribute('data-merged')).toBe('true');
    expect(absorbed.style.visibility).toBe('hidden');
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

     // The anchor kept content, others got un-hidden
     const anchor = activeTable2.querySelector('[data-cell-id="1"]');
     expect(anchor.innerHTML).toBe('A<br>B<br>C<br>D');
     expect(anchor.getAttribute('colspan')).toBeNull();
     expect(anchor.getAttribute('data-merge-descriptor')).toBeNull();

     const absorbed = activeTable2.querySelector('[data-cell-id="4"]');
     expect(absorbed.getAttribute('data-merged')).toBeNull();
     expect(absorbed.style.display).not.toBe('none');
  });
});
