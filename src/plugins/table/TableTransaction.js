import { TableGrid } from './TableGrid.js';

export class TableTransaction {
  constructor(editor, tableId) {
    this.editor = editor;
    this.tableId = tableId;
    this.table = null;
    this.grid = null;

    this._snapshotInnerHTML = null;
    this._snapshotStyle = null;
    this._snapshotBorderColor = null;
    this._snapshotCellPadding = null;
    this._snapshotCellSpacing = null;
    this._snapshotDir = null;
    this._snapshotBorder = null;
  }

  begin() {
    this.table = this.editor.editableArea.querySelector(`table[data-table-id="${this.tableId}"]`);
    if (!this.table) return false;

    this._snapshotInnerHTML = this.table.innerHTML;
    this._snapshotStyle = this.table.getAttribute('style');
    this._snapshotBorderColor = this.table.getAttribute('bordercolor');
    this._snapshotCellPadding = this.table.getAttribute('cellpadding');
    this._snapshotCellSpacing = this.table.getAttribute('cellspacing');
    this._snapshotDir = this.table.getAttribute('dir');
    this._snapshotBorder = this.table.getAttribute('border');

    this.grid = new TableGrid(this.table);
    return true;
  }

  commit() {
    if (!this.table) return false;

    if (this.table.tagName === 'TABLE') {
      const finalGrid = new TableGrid(this.table);
      if (!this._isGridValid(finalGrid)) {
        console.warn('Penman Editor: TableTransaction rolled back due to Grid Integrity Failure.');
        return this.rollback();
      }
    }

    this.table = null;
    this.grid = null;
    this._snapshotInnerHTML = null;

    this.editor.emit('change', this.editor.getContent());
    return true;
  }

  _isGridValid(gridObj) {
    const matrix = gridObj.grid;
    if (!matrix || matrix.length === 0) return false;

    const colsCount = matrix[0].length;
    for (let r = 0; r < matrix.length; r++) {
      if (!matrix[r] || matrix[r].length !== colsCount) return false;
    }
    return true;
  }

  rollback() {
    if (this.table && this._snapshotInnerHTML !== null) {
      this.table.innerHTML = this._snapshotInnerHTML;

      if (this._snapshotStyle !== null) {
        this.table.setAttribute('style', this._snapshotStyle);
      } else {
        this.table.removeAttribute('style');
      }
      if (this._snapshotBorder !== null) {
        this.table.setAttribute('border', this._snapshotBorder);
      } else {
        this.table.removeAttribute('border');
      }
      if (this._snapshotBorderColor !== null) {
        this.table.setAttribute('bordercolor', this._snapshotBorderColor);
      } else {
        this.table.removeAttribute('bordercolor');
      }
      if (this._snapshotCellPadding !== null) {
        this.table.setAttribute('cellpadding', this._snapshotCellPadding);
      } else {
        this.table.removeAttribute('cellpadding');
      }
      if (this._snapshotCellSpacing !== null) {
        this.table.setAttribute('cellspacing', this._snapshotCellSpacing);
      } else {
        this.table.removeAttribute('cellspacing');
      }
      if (this._snapshotDir !== null) {
        this.table.setAttribute('dir', this._snapshotDir);
      } else {
        this.table.removeAttribute('dir');
      }
    }

    this.table = null;
    this.grid = null;
    this._snapshotInnerHTML = null;
    return false;
  }

  mergeCells(cellIds) {
    if (!this.grid.isPerfectRectangle(cellIds)) {
      return false;
    }

    const box = this.grid.getSelectionBoundingBox(cellIds);
    if (!box) return false;

    const anchorGridCell = this.grid.grid[box.minRow][box.minCol];
    if (!anchorGridCell || !anchorGridCell.isReal) return false;

    const anchorNode = anchorGridCell.domNode;
    let newContentFragment = document.createDocumentFragment();
    const absorbedData = [];

    cellIds.forEach(id => {
      if (id !== anchorGridCell.id) {
        const gridCell = this.grid.getCellById(id);
        if (gridCell && gridCell.isReal) {
          const content = gridCell.domNode.innerHTML.trim();
          if (content) {
            while (gridCell.domNode.firstChild) {
              newContentFragment.appendChild(gridCell.domNode.firstChild);
            }
          }

          absorbedData.push({
            id: id,
            r: gridCell.rowIndex,
            c: gridCell.colIndex,
            rs: gridCell.rowSpan,
            cs: gridCell.colSpan
          });

          gridCell.domNode.remove();
        }
      }
    });

    anchorNode.appendChild(newContentFragment);

    if (absorbedData.length > 0) {
      const existingDescriptor = anchorNode.getAttribute('data-merge-descriptor');
      let finalData = absorbedData;
      if (existingDescriptor) {
        try {
          const parsed = JSON.parse(existingDescriptor);
          finalData = finalData.concat(parsed);
        } catch (e) {}
      }
      anchorNode.setAttribute('data-merge-descriptor', JSON.stringify(finalData));
    }

    const newRowSpan = (box.maxRow - box.minRow + 1);
    const newColSpan = (box.maxCol - box.minCol + 1);

    if (newRowSpan > 1) anchorNode.setAttribute('rowspan', newRowSpan);
    else anchorNode.removeAttribute('rowspan');

    if (newColSpan > 1) anchorNode.setAttribute('colspan', newColSpan);
    else anchorNode.removeAttribute('colspan');

    return true;
  }

  splitCell(cellId) {
    const gridCell = this.grid.getCellById(cellId);
    if (!gridCell || !gridCell.isReal) return false;

    const anchorNode = gridCell.domNode;
    const descriptorStr = anchorNode.getAttribute('data-merge-descriptor');
    if (!descriptorStr) return false;

    let absorbedData = [];
    try {
      absorbedData = JSON.parse(descriptorStr);
    } catch (e) {
      return false;
    }

    const rows = Array.from(this.table.querySelectorAll('tr'));

    absorbedData.sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      return a.c - b.c;
    });

    absorbedData.forEach(data => {
      const tr = rows[data.r];
      if (tr) {
        const td = document.createElement('td');
        td.setAttribute('data-cell-id', data.id);
        if (data.rs > 1) td.setAttribute('rowspan', data.rs);
        if (data.cs > 1) td.setAttribute('colspan', data.cs);
        td.style.border = anchorNode.style.border || '1px solid #ccc';
        td.style.padding = anchorNode.style.padding || '5px';
        td.innerHTML = '<p><br></p>';

        let inserted = false;
        const currentCells = Array.from(tr.querySelectorAll('td, th'));
        for (let i = 0; i < currentCells.length; i++) {
          const cell = currentCells[i];
          const cId = cell.getAttribute('data-cell-id');
          const gCell = this.grid.getCellById(cId);
          if (gCell && gCell.colIndex > data.c) {
            tr.insertBefore(td, cell);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          tr.appendChild(td);
        }
      }
    });

    anchorNode.removeAttribute('rowspan');
    anchorNode.removeAttribute('colspan');
    anchorNode.removeAttribute('data-merge-descriptor');

    return true;
  }

  // FIX: Single definition of setTableProperty (duplicate removed)
  setTableProperty(property, value) {
    if (!this.table) return false;

    const cells = Array.from(this.table.querySelectorAll('td, th'));

    if (property === 'border') {
      if (value) {
        this.table.setAttribute('border', value);
        cells.forEach(cell => cell.style.borderWidth = value + 'px');
      } else {
        this.table.removeAttribute('border');
        cells.forEach(cell => cell.style.borderWidth = '0px');
      }
    } else if (property === 'borderColor') {
      if (value) {
        this.table.setAttribute('bordercolor', value);
        this.table.style.borderColor = value;
        cells.forEach(cell => cell.style.borderColor = value);
      } else {
        this.table.removeAttribute('bordercolor');
        this.table.style.borderColor = '';
        cells.forEach(cell => cell.style.borderColor = '');
      }
    } else if (property === 'cellPadding') {
      if (value) {
        this.table.setAttribute('cellpadding', value);
        cells.forEach(cell => cell.style.padding = value + 'px');
      } else {
        this.table.removeAttribute('cellpadding');
        cells.forEach(cell => cell.style.padding = '0px');
      }
    } else if (property === 'cellSpacing') {
      if (value) {
        this.table.setAttribute('cellspacing', value);
        this.table.style.borderCollapse = 'separate';
        this.table.style.borderSpacing = value + 'px';
      } else {
        this.table.removeAttribute('cellspacing');
        this.table.style.borderCollapse = 'collapse';
        this.table.style.borderSpacing = '0px';
      }
    } else if (property === 'dir') {
      if (value) this.table.setAttribute('dir', value);
      else this.table.removeAttribute('dir');
    } else if (property === 'width') {
      this.table.style.width = value;
    } else if (property === 'padding') {
      this.table.style.padding = value;
    } else if (property === 'margin') {
      this.table.style.margin = value;
    } else if (property === 'backgroundColor') {
      this.table.style.backgroundColor = value;
    } else if (property === 'textAlign') {
      if (value === 'center') {
        this.table.style.marginLeft = 'auto';
        this.table.style.marginRight = 'auto';
      } else if (value === 'right') {
        this.table.style.marginLeft = 'auto';
        this.table.style.marginRight = '0';
      } else {
        this.table.style.marginLeft = '0';
        this.table.style.marginRight = 'auto';
      }
    }

    return true;
  }

  // FIX: Single definition of deleteTable (duplicate removed)
  deleteTable() {
    if (this.table && this.table.parentNode) {
      const p = document.createElement('p');
      this.table.parentNode.replaceChild(p, this.table);
      this.table = p;
    }
    return true;
  }

  // FIX: Single definition of addRow (duplicate removed)
  addRow(anchorCellId, position = 'after') {
    const gridCell = this.grid.getCellById(anchorCellId);
    if (!gridCell) return false;

    const rowIndex = position === 'after'
      ? gridCell.rowIndex + gridCell.rowSpan - 1
      : gridCell.rowIndex;

    const tbody = this.table.querySelector('tbody') || this.table;
    const existingRows = Array.from(tbody.querySelectorAll('tr'));
    const newTr = document.createElement('tr');
    const cols = this.grid.grid[0].length;

    for (let c = 0; c < cols; c++) {
      const cellInfo = this.grid.grid[rowIndex][c];
      let needsNewCell = true;

      if (cellInfo) {
        const effectiveId = cellInfo.isReal ? cellInfo.id : cellInfo.masterCellId;
        const masterCell = this.grid.getCellById(effectiveId);

        if (masterCell) {
          if (
            masterCell.rowIndex < rowIndex &&
            (masterCell.rowIndex + masterCell.rowSpan - 1) >= rowIndex
          ) {
            if (masterCell.colIndex === c) {
              masterCell.domNode.setAttribute('rowspan', masterCell.rowSpan + 1);
            }
            needsNewCell = false;
          }
        }
      }

      if (needsNewCell) {
        const td = document.createElement('td');
        td.setAttribute('data-cell-id', TableGrid.generateCellId());

        const tableBorder = this.table.getAttribute('border') || '1';
        const tableBorderColor = this.table.getAttribute('bordercolor') || '#ccc';
        const tableCellPadding = this.table.getAttribute('cellpadding') || '5';

        td.style.borderWidth = tableBorder + 'px';
        td.style.borderStyle = 'solid';
        td.style.borderColor = tableBorderColor;
        td.style.padding = tableCellPadding + 'px';
        td.innerHTML = '<p><br></p>';

        newTr.appendChild(td);
      }
    }

    if (position === 'after') {
      const targetRowNode = existingRows[rowIndex];
      if (targetRowNode && targetRowNode.nextSibling) {
        targetRowNode.parentNode.insertBefore(newTr, targetRowNode.nextSibling);
      } else {
        tbody.appendChild(newTr);
      }
    } else {
      const targetRowNode = existingRows[rowIndex];
      if (targetRowNode) {
        targetRowNode.parentNode.insertBefore(newTr, targetRowNode);
      } else {
        tbody.appendChild(newTr);
      }
    }

    return true;
  }

  removeRow(anchorCellId) {
    const gridCell = this.grid.getCellById(anchorCellId);
    if (!gridCell) return false;

    const rowIndex = gridCell.rowIndex;
    const tbody = this.table.querySelector('tbody') || this.table;
    const existingRows = Array.from(tbody.querySelectorAll('tr'));

    if (existingRows.length <= 1) return false;

    const targetRowNode = existingRows[rowIndex];
    if (!targetRowNode) return false;

    const cols = this.grid.grid[0].length;

    for (let c = 0; c < cols; c++) {
      const cellInfo = this.grid.grid[rowIndex][c];
      if (!cellInfo) continue;

      const effectiveId = cellInfo.isReal ? cellInfo.id : cellInfo.masterCellId;
      const masterCell = this.grid.getCellById(effectiveId);

      if (masterCell && masterCell.rowSpan > 1) {
        if (masterCell.colIndex === c) {
          masterCell.domNode.setAttribute('rowspan', masterCell.rowSpan - 1);

          if (masterCell.rowIndex === rowIndex) {
            const nextRow = existingRows[rowIndex + 1];
            if (nextRow) {
              let insertBeforeNode = null;
              for (let scanCol = c + 1; scanCol < cols; scanCol++) {
                const scanGridCell = this.grid.grid[rowIndex + 1][scanCol];
                if (scanGridCell && scanGridCell.isReal && scanGridCell.rowIndex === rowIndex + 1) {
                  insertBeforeNode = scanGridCell.domNode;
                  break;
                }
              }
              if (insertBeforeNode) {
                nextRow.insertBefore(masterCell.domNode, insertBeforeNode);
              } else {
                nextRow.appendChild(masterCell.domNode);
              }
            }
          }
        }
      }
    }

    targetRowNode.remove();
    return true;
  }

  addColumn(anchorCellId, position = 'after') {
    const gridCell = this.grid.getCellById(anchorCellId);
    if (!gridCell) return false;

    const colIndex = position === 'after'
      ? gridCell.colIndex + gridCell.colSpan - 1
      : gridCell.colIndex;

    const rowsCount = this.grid.grid.length;

    for (let r = 0; r < rowsCount; r++) {
      const cellInfo = this.grid.grid[r][colIndex];
      let needsNewCell = true;

      if (cellInfo) {
        const effectiveId = cellInfo.isReal ? cellInfo.id : cellInfo.masterCellId;
        const masterCell = this.grid.getCellById(effectiveId);

        if (masterCell) {
          if (
            masterCell.colIndex < colIndex &&
            (masterCell.colIndex + masterCell.colSpan - 1) >= colIndex
          ) {
            if (masterCell.rowIndex === r) {
              masterCell.domNode.setAttribute('colspan', masterCell.colSpan + 1);
            }
            needsNewCell = false;
          }
        }
      }

      if (needsNewCell) {
        const td = document.createElement('td');
        td.setAttribute('data-cell-id', TableGrid.generateCellId());

        const tableBorder = this.table.getAttribute('border') || '1';
        const tableBorderColor = this.table.getAttribute('bordercolor') || '#ccc';
        const tableCellPadding = this.table.getAttribute('cellpadding') || '5';

        td.style.borderWidth = tableBorder + 'px';
        td.style.borderStyle = 'solid';
        td.style.borderColor = tableBorderColor;
        td.style.padding = tableCellPadding + 'px';
        td.innerHTML = '<p><br></p>';

        const tr = this.table.querySelectorAll('tr')[r];
        if (tr) {
          let insertBeforeNode = null;
          const insertPos = position === 'after' ? colIndex + 1 : colIndex;

          for (let scanCol = insertPos; scanCol < this.grid.grid[0].length; scanCol++) {
            const scanGridCell = this.grid.grid[r][scanCol];
            if (scanGridCell && scanGridCell.isReal && scanGridCell.rowIndex === r) {
              insertBeforeNode = scanGridCell.domNode;
              break;
            }
          }

          if (insertBeforeNode) {
            tr.insertBefore(td, insertBeforeNode);
          } else {
            tr.appendChild(td);
          }
        }
      }
    }

    return true;
  }

  // FIX: Single definition of removeColumn (duplicate removed)
  removeColumn(anchorCellId) {
    const gridCell = this.grid.getCellById(anchorCellId);
    if (!gridCell) return false;

    const cols = this.grid.grid[0].length;
    if (cols <= 1) return false;

    const colIndex = gridCell.colIndex;
    const rowsCount = this.grid.grid.length;

    for (let r = 0; r < rowsCount; r++) {
      const cellInfo = this.grid.grid[r][colIndex];
      if (!cellInfo) continue;

      const effectiveId = cellInfo.isReal ? cellInfo.id : cellInfo.masterCellId;
      const masterCell = this.grid.getCellById(effectiveId);

      if (masterCell) {
        if (masterCell.colSpan > 1) {
          if (masterCell.rowIndex === r) {
            masterCell.domNode.setAttribute('colspan', masterCell.colSpan - 1);
          }
        } else {
          if (masterCell.isReal) {
            masterCell.domNode.remove();
          }
        }
      }
    }

    return true;
  }
}
