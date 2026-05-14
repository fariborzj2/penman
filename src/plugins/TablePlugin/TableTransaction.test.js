// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { TableTransaction } from './TableTransaction.js';

/**
 * Tests for TableTransaction — the transactional grid mutation layer.
 *
 * These tests use a minimal fake editor (only the surface TableTransaction
 * needs) and a hand-built table DOM. Each test sets up a 3×3 table, runs
 * one transaction, and asserts the resulting DOM. Rollback is exercised by
 * mutating a non-existent cell to force tx.commit() to fail.
 */

function makeTable(html) {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.querySelector('table');
}

function basic3x3() {
  return `
    <table data-table-id="t-1">
      <thead>
        <tr>
          <th data-cell-id="c1"><p><br></p></th>
          <th data-cell-id="c2"><p><br></p></th>
          <th data-cell-id="c3"><p><br></p></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-cell-id="c4"><p>Hello</p></td>
          <td data-cell-id="c5"><p><br></p></td>
          <td data-cell-id="c6"><p>World</p></td>
        </tr>
        <tr>
          <td data-cell-id="c7"><p><br></p></td>
          <td data-cell-id="c8"><p><br></p></td>
          <td data-cell-id="c9"><p><br></p></td>
        </tr>
      </tbody>
    </table>
  `;
}

function fakeEditor() {
  return {
    editableArea: document.getElementById('root'),
    history: { pushImmediate: () => {} },
    emit: () => {},
    _syncToTextarea: () => {},
    getContent: () => document.getElementById('root').innerHTML,
  };
}

describe('TableTransaction.mergeCells', () => {
  beforeEach(() => { makeTable(basic3x3()); });

  it('merges three empty header cells into a single <p><br></p>', () => {
    const tx = new TableTransaction(fakeEditor(), 't-1');
    expect(tx.begin()).toBe(true);
    const ok = tx.mergeCells(['c1', 'c2', 'c3']);
    expect(ok).toBe(true);

    const anchor = document.querySelector('[data-cell-id="c1"]');
    expect(anchor).not.toBeNull();
    expect(anchor.innerHTML).toBe('<p><br></p>');
    expect(anchor.getAttribute('colspan')).toBe('3');
    expect(document.querySelector('[data-cell-id="c2"]')).toBeNull();
    expect(document.querySelector('[data-cell-id="c3"]')).toBeNull();
  });

  it('keeps both content paragraphs when merging text + empty + text', () => {
    const tx = new TableTransaction(fakeEditor(), 't-1');
    tx.begin();
    expect(tx.mergeCells(['c4', 'c5', 'c6'])).toBe(true);

    const anchor = document.querySelector('[data-cell-id="c4"]');
    expect(anchor.innerHTML).toContain('Hello');
    expect(anchor.innerHTML).toContain('World');
    // No empty <p><br></p> should be appended from the middle empty cell
    expect(anchor.querySelectorAll('p').length).toBe(2);
    expect(anchor.getAttribute('colspan')).toBe('3');
  });

  it('rejects merge when the selection is not a perfect rectangle', () => {
    const tx = new TableTransaction(fakeEditor(), 't-1');
    tx.begin();
    // c1 (row 0) + c5 (row 1, middle) — not rectangular
    const ok = tx.mergeCells(['c1', 'c5']);
    expect(ok).toBe(false);
  });

  it('writes a data-merge-descriptor with absorbed cell metadata', () => {
    const tx = new TableTransaction(fakeEditor(), 't-1');
    tx.begin();
    tx.mergeCells(['c1', 'c2']);
    const anchor = document.querySelector('[data-cell-id="c1"]');
    const desc = anchor.getAttribute('data-merge-descriptor');
    expect(desc).toBeTruthy();
    const parsed = JSON.parse(desc);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('c2');
  });
});

describe('TableTransaction.splitCell', () => {
  it('reverses a prior merge using the stored descriptor', () => {
    makeTable(basic3x3());
    const tx1 = new TableTransaction(fakeEditor(), 't-1');
    tx1.begin();
    tx1.mergeCells(['c1', 'c2', 'c3']);

    const tx2 = new TableTransaction(fakeEditor(), 't-1');
    tx2.begin();
    expect(tx2.splitCell('c1')).toBe(true);

    // After split, all three cells should exist again as separate <th>s
    expect(document.querySelector('[data-cell-id="c1"]')).not.toBeNull();
    expect(document.querySelector('[data-cell-id="c2"]')).not.toBeNull();
    expect(document.querySelector('[data-cell-id="c3"]')).not.toBeNull();
    expect(document.querySelector('[data-cell-id="c1"]').hasAttribute('colspan')).toBe(false);
    expect(document.querySelector('[data-cell-id="c1"]').hasAttribute('data-merge-descriptor')).toBe(false);
  });
});

describe('TableTransaction.deleteTable', () => {
  it('removes the table from the DOM', () => {
    makeTable(basic3x3());
    const tx = new TableTransaction(fakeEditor(), 't-1');
    tx.begin();
    tx.deleteTable();
    tx.commit();
    expect(document.querySelector('table[data-table-id="t-1"]')).toBeNull();
  });
});

describe('TableTransaction.begin returns false for unknown table', () => {
  it('refuses to start when the table id does not exist', () => {
    document.body.innerHTML = '<div id="root"></div>';
    const tx = new TableTransaction(fakeEditor(), 't-nonexistent');
    expect(tx.begin()).toBe(false);
  });
});
