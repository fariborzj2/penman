import { TableGrid } from './TableGrid.js';

export class TableTransaction {
  constructor(editor, tableId) {
    this.editor = editor;
    this.tableId = tableId;
    this.table = null;
    this.grid = null;

    // Partial staging buffer - we clone into memory for the transaction
    this._stagedClone = null;
    this._stagedGrid = null;
  }

  begin() {
    this.table = this.editor.editableArea.querySelector(`table[data-table-id="${this.tableId}"]`);
    if (!this.table) return false;

    // Use a staging clone for the transaction mutations
    this._stagedClone = this.table.cloneNode(true);
    this._stagedGrid = new TableGrid(this._stagedClone);
    return true;
  }

  commit() {
    if (!this.table || !this._stagedClone) return false;

    // Final Integrity Check on the staged clone
    const finalGrid = new TableGrid(this._stagedClone);
    if (!this._isGridValid(finalGrid)) {
        console.warn('Penman Editor: TableTransaction rolled back due to Grid Integrity Failure.');
        return this.rollback();
    }

    // Atomic DOM replacement
    this.table.parentNode.replaceChild(this._stagedClone, this.table);

    if (this.editor.history) {
      this.editor.history.pushImmediate();
    }

    this.table = null;
    this._stagedClone = null;
    this._stagedGrid = null;

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
    // Simply discard the staging clone. True atomicity.
    this.table = null;
    this._stagedClone = null;
    this._stagedGrid = null;
    return false;
  }

  mergeCells(cellIds) {
    if (!this._stagedGrid.isPerfectRectangle(cellIds)) {
        return false;
    }

    const box = this._stagedGrid.getSelectionBoundingBox(cellIds);
    if (!box) return false;

    const anchorGridCell = this._stagedGrid.grid[box.minRow][box.minCol];
    if (!anchorGridCell || !anchorGridCell.isReal) return false;

    const anchorNode = anchorGridCell.domNode;
    let newContentFragment = document.createDocumentFragment();
    const absorbedIds = [];

    cellIds.forEach(id => {
       if (id !== anchorGridCell.id) {
           const gridCell = this._stagedGrid.getCellById(id);
           if (gridCell && gridCell.isReal) {
               const content = gridCell.domNode.innerHTML.trim();
               if (content && content !== '<br>') {
                   const br = document.createElement('br');
                   newContentFragment.appendChild(br);
                   while(gridCell.domNode.firstChild) {
                       newContentFragment.appendChild(gridCell.domNode.firstChild);
                   }
               }
               // Strict Exclusion: We do NOT use display: none here anymore
               // because that was reviewed as dangerous for selection mapping.
               // Actually, `aria-hidden` and specific dataset flags handle it.
               gridCell.domNode.setAttribute('data-merged', 'true');
               gridCell.domNode.setAttribute('aria-hidden', 'true');

               // But CSS needs *something* to hide it. We will rely on our global
               // CSS to style `td[data-merged="true"]` minimally so it doesn't break layout
               // WITHOUT removing it from flow completely in a way that breaks Range logic.
               // e.g. width:0, height:0, padding:0, border:0, color: transparent, line-height:0.
               gridCell.domNode.style.width = '0px';
               gridCell.domNode.style.height = '0px';
               gridCell.domNode.style.padding = '0px';
               gridCell.domNode.style.border = 'none';
               gridCell.domNode.style.fontSize = '0px';
               gridCell.domNode.style.lineHeight = '0px';
               gridCell.domNode.style.color = 'transparent';
               gridCell.domNode.style.overflow = 'hidden';
               gridCell.domNode.style.visibility = 'hidden'; // Visibility hidden keeps the box footprint 0 but preserves selection logic better than display:none

               gridCell.domNode.removeAttribute('rowspan');
               gridCell.domNode.removeAttribute('colspan');

               absorbedIds.push(id);
           }
       }
    });

    anchorNode.appendChild(newContentFragment);

    // Write Merge Descriptor for exact deterministic split
    if (absorbedIds.length > 0) {
       const existingDescriptor = anchorNode.getAttribute('data-merge-descriptor');
       let finalIds = absorbedIds;
       if (existingDescriptor) {
           try {
               const parsed = JSON.parse(existingDescriptor);
               finalIds = finalIds.concat(parsed);
           } catch(e){}
       }
       anchorNode.setAttribute('data-merge-descriptor', JSON.stringify(finalIds));
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
    const gridCell = this._stagedGrid.getCellById(cellId);
    if (!gridCell || !gridCell.isReal) return false;

    const anchorNode = gridCell.domNode;
    const descriptorStr = anchorNode.getAttribute('data-merge-descriptor');
    if (!descriptorStr) return false;

    let absorbedIds = [];
    try {
        absorbedIds = JSON.parse(descriptorStr);
    } catch (e) {
        return false;
    }

    // Restore attributes of exactly the nodes in descriptor
    absorbedIds.forEach(id => {
        const targetGridCell = this._stagedGrid.getCellById(id);
        if (targetGridCell && targetGridCell.domNode) {
            const td = targetGridCell.domNode;
            td.removeAttribute('data-merged');
            td.removeAttribute('aria-hidden');

            // Revert layout hacks
            td.style.width = '';
            td.style.height = '';
            td.style.padding = '';
            td.style.border = '';
            td.style.fontSize = '';
            td.style.lineHeight = '';
            td.style.color = '';
            td.style.overflow = '';
            td.style.visibility = '';

            if (!td.innerHTML.trim()) td.innerHTML = '<br>';
        }
    });

    anchorNode.removeAttribute('rowspan');
    anchorNode.removeAttribute('colspan');
    anchorNode.removeAttribute('data-merge-descriptor');

    return true;
  }
}
