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
    allSelected.forEach(el => el.classList.remove('penman-cell-selected'));

    if (this.activeTableNode && this.isCellSelectionActive) {
      this.selectedCellIds.forEach(id => {
        const cellNode = this.activeTableNode.querySelector(`[data-cell-id="${id}"]`);
        if (cellNode) {
          cellNode.classList.add('penman-cell-selected');
        }
      });
    }
  }

  applyFormatToSelection(cmd, value) {
    if (!this.isCellSelectionActive || !this.activeTableNode) return;

    this.selectedCellIds.forEach(id => {
      const cellNode = this.activeTableNode.querySelector(`[data-cell-id="${id}"]`);
      if (cellNode) {
         if (['bold', 'italic', 'underline'].includes(cmd)) {
             const tagMap = { 'bold': 'strong', 'italic': 'em', 'underline': 'u' };
             const targetTag = tagMap[cmd];

             // Wrap content text nodes specifically, avoiding block-level wrappers
             // like <p> being incorrectly wrapped in inline <strong>.
             Array.from(cellNode.childNodes).forEach(child => {
                 if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                     const wrapper = document.createElement(targetTag);
                     cellNode.insertBefore(wrapper, child);
                     wrapper.appendChild(child);
                 } else if (child.nodeType === Node.ELEMENT_NODE) {
                     // Block elements or other formatting inside the cell
                     if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName.toLowerCase())) {
                          const range = document.createRange();
                          range.selectNodeContents(child);
                          if (!range.collapsed) {
                             const wrapper = document.createElement(targetTag);
                             wrapper.appendChild(range.extractContents());
                             range.insertNode(wrapper);
                          }
                     } else {
                         // Inline element
                         const range = document.createRange();
                         range.selectNode(child);
                         const wrapper = document.createElement(targetTag);
                         wrapper.appendChild(range.extractContents());
                         range.insertNode(wrapper);
                     }
                 }
             });

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
