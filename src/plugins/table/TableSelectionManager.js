import { TableGrid } from './TableGrid.js';

export class TableSelectionManager {
  constructor(editor) {
    this.editor = editor;
    this.selectedCellIds = [];
    this.activeTableNode = null;
    this.isCellSelectionActive = false;
  }

  selectRange(tableNode, startCellId, endCellId) {
    this.activeTableNode = tableNode;

    const grid = new TableGrid(tableNode);
    const startCell = grid.getCellById(startCellId);
    const endCell = grid.getCellById(endCellId);

    if (!startCell || !endCell) return;

    const minRow = Math.min(startCell.rowIndex, endCell.rowIndex);
    const maxRow = Math.max(
        startCell.rowIndex + startCell.rowSpan - 1,
        endCell.rowIndex + endCell.rowSpan - 1
    );
    const minCol = Math.min(startCell.colIndex, endCell.colIndex);
    const maxCol = Math.max(
        startCell.colIndex + startCell.colSpan - 1,
        endCell.colIndex + endCell.colSpan - 1
    );

    const newSelection = new Set();

    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            const gridCell = grid.grid[r][c];
            if (gridCell) {
                if (gridCell.masterCellId === 'MERGED_AWAY') continue;
                const realId = gridCell.isReal ? gridCell.id : gridCell.masterCellId;
                newSelection.add(realId);
            }
        }
    }

    this.selectedCellIds = Array.from(newSelection);
    this.isCellSelectionActive = this.selectedCellIds.length > 0;

    this._renderSelection();

    if (this.isCellSelectionActive) {
       // SHADOW SELECTION FIX: We do NOT remove the browser selection ranges anymore.
       // The native browser selection is maintained as a "shadow state" mirroring our cell selection,
       // preventing focus jumps and preserving accessibility.
       this.editor.emit('tableSelectionChange', this.selectedCellIds, this.activeTableNode);
    }
  }

  selectCell(tableNode, cellId) {
     this.selectRange(tableNode, cellId, cellId);
  }

  clearSelection() {
    if (!this.isCellSelectionActive) return;
    this.selectedCellIds = [];
    this.isCellSelectionActive = false;
    this.activeTableNode = null;
    this._renderSelection();
    this.editor.emit('tableSelectionChange', [], null);
  }

  getSelectedCellIds() {
    return [...this.selectedCellIds];
  }

  _renderSelection() {
    const allSelected = this.editor.editableArea.querySelectorAll('.penman-cell-selected');
    allSelected.forEach(el => {
        el.classList.remove('penman-cell-selected');
        // Remove handles
        const handles = el.querySelectorAll('[class^="penman-cell-handle-"]');
        handles.forEach(h => h.remove());
    });

    if (this.activeTableNode && this.isCellSelectionActive) {
      const grid = new TableGrid(this.activeTableNode);
      const box = grid.getSelectionBoundingBox(this.selectedCellIds);

      this.selectedCellIds.forEach(id => {
        const cellNode = this.activeTableNode.querySelector(`[data-cell-id="${id}"]`);
        if (cellNode) {
          cellNode.classList.add('penman-cell-selected');

          if (box) {
              const gridCell = grid.getCellById(id);
              if (gridCell && gridCell.isReal) {
                  // Check if it's on the boundary corners to add handles
                  const isTop = gridCell.rowIndex === box.minRow;
                  const isBottom = (gridCell.rowIndex + gridCell.rowSpan - 1) === box.maxRow;
                  const isLeft = gridCell.colIndex === box.minCol;
                  const isRight = (gridCell.colIndex + gridCell.colSpan - 1) === box.maxCol;

                  if (isTop && isLeft) {
                      const handle = document.createElement('div');
                      handle.className = 'penman-cell-handle-tl';
                      cellNode.appendChild(handle);
                  }
                  if (isTop && isRight) {
                      const handle = document.createElement('div');
                      handle.className = 'penman-cell-handle-tr';
                      cellNode.appendChild(handle);
                  }
                  if (isBottom && isLeft) {
                      const handle = document.createElement('div');
                      handle.className = 'penman-cell-handle-bl';
                      cellNode.appendChild(handle);
                  }
                  if (isBottom && isRight) {
                      const handle = document.createElement('div');
                      handle.className = 'penman-cell-handle-br';
                      cellNode.appendChild(handle);
                  }
              }
          }
        }
      });
    }
  }

  applyFormatToSelection(cmd, value) {
    if (!this.isCellSelectionActive || !this.activeTableNode) return;

    // State check to see if we should apply or remove the format across the selection
    let isFormatActive = true;

    // We determine the active state by checking the first selected cell.
    // If it has the format, we assume the user wants to untoggle it.
    if (this.selectedCellIds.length > 0 && ['bold', 'italic', 'underline'].includes(cmd)) {
        const firstCell = this.activeTableNode.querySelector(`[data-cell-id="${this.selectedCellIds[0]}"]`);
        if (firstCell) {
            const tagMap = { 'bold': 'strong', 'italic': 'em', 'underline': 'u' };
            const targetTag = tagMap[cmd];
            // Check if there is any targetTag directly wrapping content inside the cell
            isFormatActive = !!firstCell.querySelector(targetTag);
        }
    }

    this.selectedCellIds.forEach(id => {
      const cellNode = this.activeTableNode.querySelector(`[data-cell-id="${id}"]`);
      if (cellNode) {
         if (['bold', 'italic', 'underline'].includes(cmd)) {
             const tagMap = { 'bold': 'strong', 'italic': 'em', 'underline': 'u' };
             const targetTag = tagMap[cmd];

             if (isFormatActive) {
                 // Remove format: Find all target tags and unwrap them
                 const existingTags = Array.from(cellNode.querySelectorAll(targetTag));
                 existingTags.forEach(tag => {
                     while(tag.firstChild) {
                         tag.parentNode.insertBefore(tag.firstChild, tag);
                     }
                     tag.remove();
                 });
             } else {
                 // Apply format: Traverse children, ignoring already wrapped ones
                 Array.from(cellNode.childNodes).forEach(child => {
                     // Prevent deeply nested tags (<strong><strong>...</strong></strong>)
                     if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === targetTag) {
                         return; // Already formatted at this level
                     }

                     if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                         const wrapper = document.createElement(targetTag);
                         cellNode.insertBefore(wrapper, child);
                         wrapper.appendChild(child);
                     } else if (child.nodeType === Node.ELEMENT_NODE) {
                         if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName.toLowerCase())) {
                              // Check if paragraph already contains only the target tag
                              if (child.children.length === 1 && child.children[0].tagName.toLowerCase() === targetTag) return;

                              const range = document.createRange();
                              range.selectNodeContents(child);
                              if (!range.collapsed) {
                                 const wrapper = document.createElement(targetTag);
                                 wrapper.appendChild(range.extractContents());
                                 range.insertNode(wrapper);
                              }
                         } else {
                             const range = document.createRange();
                             range.selectNode(child);
                             const wrapper = document.createElement(targetTag);
                             wrapper.appendChild(range.extractContents());
                             range.insertNode(wrapper);
                         }
                     }
                 });
             }

         } else {
             const alignMap = { 'justifyleft': 'left', 'justifycenter': 'center', 'justifyright': 'right', 'justifyfull': 'justify' };
             if (alignMap[cmd]) {
                cellNode.style.textAlign = alignMap[cmd];
             }
         }
      }
    });

    if (this.editor.history) {
        this.editor.history.pushImmediate();
    }
    this.editor.emit('change', this.editor.getContent());
  }
}
