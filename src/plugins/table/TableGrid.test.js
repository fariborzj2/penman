/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { TableGrid } from './TableGrid.js';

describe('TableGrid', () => {
  it('should parse a basic table into a grid', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tbody>
        <tr><td data-cell-id="1">A</td><td data-cell-id="2">B</td></tr>
        <tr><td data-cell-id="3">C</td><td data-cell-id="4">D</td></tr>
      </tbody>
    `;

    const grid = new TableGrid(table);
    expect(grid.grid.length).toBe(2);
    expect(grid.grid[0].length).toBe(2);
    expect(grid.grid[1][1].id).toBe('4');
  });

  it('should handle colspans and rowspans accurately', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tbody>
        <tr><td data-cell-id="1" colspan="2">A</td><td data-cell-id="2" rowspan="2">B</td></tr>
        <tr><td data-cell-id="3">C</td><td data-cell-id="4">D</td></tr>
      </tbody>
    `;

    const grid = new TableGrid(table);
    expect(grid.grid.length).toBe(2);
    expect(grid.grid[0].length).toBe(3); // A spans 2, B is 1

    const cellA_part1 = grid.grid[0][0];
    const cellA_part2 = grid.grid[0][1];
    expect(cellA_part1.isReal).toBe(true);
    expect(cellA_part2.isReal).toBe(false);
    expect(cellA_part2.masterCellId).toBe('1');

    const cellB_part1 = grid.grid[0][2];
    const cellB_part2 = grid.grid[1][2];
    expect(cellB_part1.isReal).toBe(true);
    expect(cellB_part2.isReal).toBe(false);
    expect(cellB_part2.masterCellId).toBe('2');

    expect(grid.grid[1][0].id).toBe('3');
    expect(grid.grid[1][1].id).toBe('4');
  });

  it('should validate perfect rectangles accurately', () => {
     const table = document.createElement('table');
     table.innerHTML = `
       <tbody>
         <tr><td data-cell-id="1">A</td><td data-cell-id="2">B</td><td data-cell-id="3">C</td></tr>
         <tr><td data-cell-id="4">D</td><td data-cell-id="5">E</td><td data-cell-id="6">F</td></tr>
         <tr><td data-cell-id="7">G</td><td data-cell-id="8">H</td><td data-cell-id="9">I</td></tr>
       </tbody>
     `;

     const grid = new TableGrid(table);

     // 1x2 selection
     expect(grid.isPerfectRectangle(['1', '2'])).toBe(true);
     // 2x2 selection
     expect(grid.isPerfectRectangle(['1', '2', '4', '5'])).toBe(true);
     // Missing a cell (Not rectangle)
     expect(grid.isPerfectRectangle(['1', '2', '4'])).toBe(false);
     // L-shape
     expect(grid.isPerfectRectangle(['1', '4', '5'])).toBe(false);
  });

  it('should reject rectangle if a spanned cell protrudes', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tbody>
        <tr><td data-cell-id="1" rowspan="2">A</td><td data-cell-id="2">B</td></tr>
        <tr><td data-cell-id="3">C</td></tr>
      </tbody>
    `;

    const grid = new TableGrid(table);
    // User tries to select 1 and 2 (row 0), but 1 protrudes to row 1.
    // That means selecting just row 0 is not a perfect rectangle because cell 1 extends outside the [row0] bounding box.
    expect(grid.isPerfectRectangle(['1', '2'])).toBe(false);

    // However, selecting the whole 2x2 is fine
    expect(grid.isPerfectRectangle(['1', '2', '3'])).toBe(true);
  });
});
