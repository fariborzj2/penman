/**
 * TableGrid - On-the-fly computational layer for table structure
 * Parses an HTML table into a 2D mathematical grid and allows querying structural layout.
 * Respects data-merged="true" logically.
 */
export class TableGrid {
  constructor(tableElement) {
    this.table = tableElement;
    this.grid = [];
    this.cellMap = new Map(); // Maps cellId to GridCell
    this._buildGrid();
  }

  static generateCellId() {
    return 'c-' + Math.random().toString(36).substr(2, 9);
  }

  _buildGrid() {
    this.grid = [];
    this.cellMap.clear();

    const rows = Array.from(this.table.querySelectorAll('tr'));

    if (!this.table.getAttribute('data-table-id')) {
      this.table.setAttribute('data-table-id', 't-' + Math.random().toString(36).substr(2, 9));
    }

    rows.forEach((tr, rIndex) => {
      if (!this.grid[rIndex]) this.grid[rIndex] = [];

      let cIndex = 0;
      const cells = Array.from(tr.querySelectorAll('td, th'));

      cells.forEach(cell => {
        // Skip over columns already occupied by rowspans from previous rows or colspans from previous cells in this row
        while (this.grid[rIndex][cIndex]) {
          cIndex++;
        }

        let cellId = cell.getAttribute('data-cell-id');
        if (!cellId) {
          cellId = TableGrid.generateCellId();
          cell.setAttribute('data-cell-id', cellId);
        }

        const rowSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10);

        const gridCell = {
          domNode: cell,
          id: cellId,
          rowIndex: rIndex,
          colIndex: cIndex,
          rowSpan: rowSpan,
          colSpan: colSpan,
          isReal: true,
          masterCellId: null
        };

        this.cellMap.set(cellId, gridCell);

        for (let r = 0; r < rowSpan; r++) {
          for (let c = 0; c < colSpan; c++) {
            const targetRow = rIndex + r;
            const targetCol = cIndex + c;

            if (!this.grid[targetRow]) {
               this.grid[targetRow] = [];
            }

            if (r === 0 && c === 0) {
              this.grid[targetRow][targetCol] = gridCell;
            } else {
              this.grid[targetRow][targetCol] = {
                ...gridCell,
                isReal: false,
                masterCellId: cellId,
                rowIndex: targetRow,
                colIndex: targetCol
              };
            }
          }
        }
      });
    });
  }

  getCellById(cellId) {
    return this.cellMap.get(cellId) || null;
  }

  getSelectionBoundingBox(cellIds) {
    if (!cellIds || cellIds.length === 0) return null;

    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    cellIds.forEach(id => {
      const cell = this.getCellById(id);
      if (cell && cell.isReal) {
        minRow = Math.min(minRow, cell.rowIndex);
        maxRow = Math.max(maxRow, cell.rowIndex + cell.rowSpan - 1);
        minCol = Math.min(minCol, cell.colIndex);
        maxCol = Math.max(maxCol, cell.colIndex + cell.colSpan - 1);
      }
    });

    return { minRow, maxRow, minCol, maxCol };
  }

  isPerfectRectangle(cellIds) {
    const box = this.getSelectionBoundingBox(cellIds);
    if (!box) return false;

    let expectedCellsCount = 0;
    const foundCells = new Set();

    for (let r = box.minRow; r <= box.maxRow; r++) {
      for (let c = box.minCol; c <= box.maxCol; c++) {
        const gridCell = this.grid[r][c];
        if (!gridCell) return false;
        if (gridCell.masterCellId === 'MERGED_AWAY') continue;

        const effectiveId = gridCell.isReal ? gridCell.id : gridCell.masterCellId;

        const masterCell = this.getCellById(effectiveId);
        if (masterCell) {
            if (masterCell.rowIndex < box.minRow ||
                (masterCell.rowIndex + masterCell.rowSpan - 1) > box.maxRow ||
                masterCell.colIndex < box.minCol ||
                (masterCell.colIndex + masterCell.colSpan - 1) > box.maxCol) {
                return false;
            }
        }

        if (!foundCells.has(effectiveId)) {
          foundCells.add(effectiveId);
          expectedCellsCount++;
        }
      }
    }

    const requestedSet = new Set(cellIds);
    if (requestedSet.size !== expectedCellsCount) return false;

    for (const id of foundCells) {
      if (!requestedSet.has(id)) return false;
    }

    return true;
  }
}
