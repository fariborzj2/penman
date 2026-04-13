import { TableGrid } from './TableGrid.js';

export class TableTransaction {
  constructor(editor, tableId) {
    this.editor = editor;
    this.tableId = tableId;
    this.table = null;
    this.grid = null;

    // Instead of cloning the DOM, we record the HTML snapshot of the table content
    // and explicitly rollback just its innerHTML. The <table data-table-id="..."> node stays intact natively.
    // This allows event listeners on the table element itself to survive, but interior ones will be wiped ONLY on rollback.
    // Actually, to preserve pure DOM identity, rollback should use a mutation array.
    // However, since rollback is only an ERROR state (validation failed), `innerHTML` restoration is an acceptable tradeoff
    // to avoid massive complexity. The key is that successful COMMIT does NOT do innerHTML replacement!
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

    // Buffer snapshot for rollback only. We will mutate this.table directly.
    this._snapshotInnerHTML = this.table.innerHTML;
    this._snapshotStyle = this.table.getAttribute('style');
    this._snapshotBorderColor = this.table.getAttribute('bordercolor');
    this._snapshotCellPadding = this.table.getAttribute('cellpadding');
    this._snapshotCellSpacing = this.table.getAttribute('cellspacing');
    this._snapshotDir = this.table.getAttribute('dir');
    this._snapshotBorder = this.table.getAttribute('border');

    // Grid alignment calculation based on CURRENT DOM state
    this.grid = new TableGrid(this.table);
    return true;
  }

  commit() {
    if (!this.table) return false;

    if (this.table.tagName === 'TABLE') {
       // Real-time Integrity Check on the mutated DOM
       const finalGrid = new TableGrid(this.table);
       if (!this._isGridValid(finalGrid)) {
           console.warn('Penman Editor: TableTransaction rolled back due to Grid Integrity Failure.');
           return this.rollback();
       }
    }



    // Cleanup
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
     for(let r=0; r<matrix.length; r++) {
         if (!matrix[r] || matrix[r].length !== colsCount) return false;
     }
     return true;
  }

  rollback() {
    if (this.table && this._snapshotInnerHTML !== null) {
        // Rollback restores the table's interior if we corrupted it during a failed mutation.
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
    const absorbedIds = [];
    const absorbedData = [];

    cellIds.forEach(id => {
       if (id !== anchorGridCell.id) {
           const gridCell = this.grid.getCellById(id);
           if (gridCell && gridCell.isReal) {
               const content = gridCell.domNode.innerHTML.trim();
               if (content && content !== '<br>') {
                   const br = document.createElement('br');
                   newContentFragment.appendChild(br);
                   while(gridCell.domNode.firstChild) {
                       newContentFragment.appendChild(gridCell.domNode.firstChild);
                   }
               }

               // Store original grid position before removing so we can restore it exactly
               absorbedData.push({
                   id: id,
                   r: gridCell.rowIndex,
                   c: gridCell.colIndex,
                   rs: gridCell.rowSpan,
                   cs: gridCell.colSpan
               });

               absorbedIds.push(id);

               // PHYSICALLY REMOVE NODE FROM DOM
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
           } catch(e){}
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

    // Sort to handle row order nicely
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
            td.innerHTML = '<br>';

            // Re-insert logic based on the original grid colIndex relative to existing cells in that row
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

  deleteTable() {
     if (this.table && this.table.parentNode) {
         const p = document.createElement('p');
         p.innerHTML = '<br>';
         this.table.parentNode.replaceChild(p, this.table);
         // Mark as completely deleted so commit doesn't fail Grid checks
         this.table = p;
     }
     return true;
  }

  addRow(anchorCellId, position = 'after') {
    const gridCell = this.grid.getCellById(anchorCellId);
    if (!gridCell) return false;

    const rowIndex = position === 'after' ? gridCell.rowIndex + gridCell.rowSpan - 1 : gridCell.rowIndex;

    const tbody = this.table.querySelector('tbody') || this.table;
    const existingRows = Array.from(tbody.querySelectorAll('tr'));

    const newTr = document.createElement('tr');

    let newCellCount = 0;
    const cols = this.grid.grid[0].length;

    for (let c = 0; c < cols; c++) {
        const cellInfo = this.grid.grid[rowIndex][c];

        let needsNewCell = true;

        if (cellInfo) {
           const effectiveId = cellInfo.isReal ? cellInfo.id : cellInfo.masterCellId;
           const masterCell = this.grid.getCellById(effectiveId);

           if (masterCell) {
              if (masterCell.rowIndex < rowIndex && (masterCell.rowIndex + masterCell.rowSpan - 1) >= rowIndex) {
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
            td.innerHTML = '<br>';
            newTr.appendChild(td);
            newCellCount++;
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
                         for(let scanCol = c + 1; scanCol < cols; scanCol++) {
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

     const colIndex = position === 'after' ? gridCell.colIndex + gridCell.colSpan - 1 : gridCell.colIndex;
     const rowsCount = this.grid.grid.length;

     for (let r = 0; r < rowsCount; r++) {
         const cellInfo = this.grid.grid[r][colIndex];
         let needsNewCell = true;

         if (cellInfo) {
             const effectiveId = cellInfo.isReal ? cellInfo.id : cellInfo.masterCellId;
             const masterCell = this.grid.getCellById(effectiveId);

             if (masterCell) {
                 if (masterCell.colIndex < colIndex && (masterCell.colIndex + masterCell.colSpan - 1) >= colIndex) {
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
             td.innerHTML = '<br>';

             const tr = this.table.querySelectorAll('tr')[r];
             if (tr) {
                 let insertBeforeNode = null;
                 const insertPos = position === 'after' ? colIndex + 1 : colIndex;

                 for(let scanCol = insertPos; scanCol < this.grid.grid[0].length; scanCol++) {
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
