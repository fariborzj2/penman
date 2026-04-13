import { TableTransaction } from './table/TableTransaction.js';
import { TableSelectionManager } from './table/TableSelectionManager.js';
import { FloatingUI } from '../ui/FloatingUI.js';
import { TableGrid } from './table/TableGrid.js';

export function setupTablePlugin(editor) {
  // 1. Setup Selection Manager
  const selectionManager = new TableSelectionManager(editor);
  let floatingUI = null;

  // 2. Setup Commands
  editor.commands.register('INSERT_TABLE', {
    execute: (editor, { rows = 2, cols = 2 } = {}) => {
      const tableId = 't-' + Math.random().toString(36).substr(2, 9);
      let html = `<table data-table-id="${tableId}" border="1" style="width: 100%; border-collapse: collapse;"><tbody>`;
      for(let r=0; r<rows; r++) {
         html += `<tr>`;
         for(let c=0; c<cols; c++) {
             html += `<td data-cell-id="c-${Math.random().toString(36).substr(2, 9)}"><br></td>`;
         }
         html += `</tr>`;
      }
      html += `</tbody></table><p><br></p>`;

      editor.insertContent(html);
    }
  });

  editor.commands.register('MERGE_CELLS', {
    execute: (editor) => {
       const tableNode = selectionManager.activeTableNode;
       if (!tableNode) return;
       const tableId = tableNode.getAttribute('data-table-id');
       const cellIds = selectionManager.getSelectedCellIds();

       if (cellIds.length < 2) return;

       const tx = new TableTransaction(editor, tableId);
       if (tx.begin()) {
           if (tx.mergeCells(cellIds)) {
               tx.commit();
               selectionManager.clearSelection();
           } else {
               tx.rollback();
               alert("Cannot merge: Selected cells do not form a perfect rectangle.");
           }
       }
    }
  });

  editor.commands.register('SPLIT_CELL', {
      execute: (editor) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const tableId = tableNode.getAttribute('data-table-id');
          const cellIds = selectionManager.getSelectedCellIds();

          if (cellIds.length !== 1) return;

          const tx = new TableTransaction(editor, tableId);
          if (tx.begin()) {
              if (tx.splitCell(cellIds[0])) {
                  tx.commit();
                  selectionManager.clearSelection();
              } else {
                  tx.rollback();
              }
          }
      }
  });

  // 3. UI Buttons (Toolbar)
  editor.ui.registry.addButton('table', {
      text: 'Table',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v3h6V6H5zm8 0v3h6V6h-6zm-8 5v3h6v-3H5zm8 0v3h6v-3h-6zm-8 5v3h6v-3H5zm8 0v3h6v-3h-6z"/></svg>',
      onAction: () => {
          editor.execCommand('INSERT_TABLE', { rows: 3, cols: 3 });
      }
  });

  // 4. Intercept Formatting Commands for Cell Selection
  const originalExec = editor.execCommand.bind(editor);
  editor.execCommand = (cmd, value) => {
      // If we are in cell selection, intercept formats
      if (selectionManager.isCellSelectionActive &&
          editor.commands.fallbackWhitelist.includes(cmd)) {
          selectionManager.applyFormatToSelection(cmd, value);
          return;
      }
      originalExec(cmd, value);
  };

  // 5. Event Listeners for Selection and Floating UI
  let isDragging = false;
  let dragStartCellId = null;

  editor.editableArea.addEventListener('mousedown', (e) => {
      const td = e.target.closest('td, th');
      if (td) {
          const table = td.closest('table');
          isDragging = true;
          dragStartCellId = td.getAttribute('data-cell-id');
          // If clicking inside a table, we clear any cross-table selection
          if (selectionManager.activeTableNode !== table) {
              selectionManager.clearSelection();
          }
      } else {
          // Clicked outside table
          selectionManager.clearSelection();
          if (floatingUI) floatingUI.hide();
      }
  });

  editor.editableArea.addEventListener('mouseover', (e) => {
      if (!isDragging) return;
      const td = e.target.closest('td, th');
      if (td) {
          const table = td.closest('table');
          const dragEndCellId = td.getAttribute('data-cell-id');
          if (dragStartCellId !== dragEndCellId) {
             selectionManager.selectRange(table, dragStartCellId, dragEndCellId);
          }
      }
  });

  editor.editableArea.addEventListener('mouseup', () => {
      isDragging = false;
      dragStartCellId = null;
  });

  // Intercept SelectionChange to hide/show UI or sync Caret selection to single-cell
  editor.on('selectionChange', () => {
     if (selectionManager.isCellSelectionActive) return; // Ignore if we are doing multi-cell

     const sel = window.getSelection();
     if (!sel || sel.rangeCount === 0) {
         if (floatingUI) floatingUI.hide();
         return;
     }

     const node = sel.anchorNode;
     if (!node) return;

     const td = (node.nodeType === Node.TEXT_NODE ? node.parentNode : node).closest('td, th');
     if (td) {
         // Show Floating UI for this single cell
         if (!floatingUI) createFloatingUI();

         const table = td.closest('table');
         selectionManager.activeTableNode = table;
         selectionManager.selectedCellIds = [td.getAttribute('data-cell-id')];

         floatingUI.setAnchor(td);
         floatingUI.show();
         updateFloatingUIButtons(td);
     } else {
         if (floatingUI) floatingUI.hide();
         selectionManager.activeTableNode = null;
     }
  });

  editor.on('tableSelectionChange', (cellIds, tableNode) => {
      if (cellIds.length > 0 && tableNode) {
         if (!floatingUI) createFloatingUI();
         // Anchor to the first cell for simplicity, or we could anchor to the table
         const firstCell = tableNode.querySelector(`[data-cell-id="${cellIds[0]}"]`);
         floatingUI.setAnchor(firstCell);
         floatingUI.show();
         updateFloatingUIButtons(firstCell);
      } else {
         if (floatingUI) floatingUI.hide();
      }
  });

  function createFloatingUI() {
     floatingUI = new FloatingUI(editor, { offset: 10, placement: 'top' });
     const html = `
        <div class="penman-table-toolbar" style="background: white; border: 1px solid #ccc; padding: 4px; border-radius: 4px; display: flex; gap: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
           <button type="button" class="penman-btn penman-btn-table-merge" title="Merge Cells" style="padding: 2px 6px;">M</button>
           <button type="button" class="penman-btn penman-btn-table-split" title="Split Cell" style="padding: 2px 6px;">S</button>
        </div>
     `;
     floatingUI.mount(html);

     // Bind buttons
     floatingUI.element.querySelector('.penman-btn-table-merge').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.execCommand('MERGE_CELLS');
     });

     floatingUI.element.querySelector('.penman-btn-table-split').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.execCommand('SPLIT_CELL');
     });
  }

  function updateFloatingUIButtons(anchorCell) {
      if (!floatingUI) return;
      const cellIds = selectionManager.getSelectedCellIds();
      const mergeBtn = floatingUI.element.querySelector('.penman-btn-table-merge');
      const splitBtn = floatingUI.element.querySelector('.penman-btn-table-split');

      // Merge active only if > 1 selected
      mergeBtn.disabled = cellIds.length < 2;

      // Split active only if 1 selected and it has span > 1
      if (cellIds.length === 1 && anchorCell) {
         const rs = parseInt(anchorCell.getAttribute('rowspan') || '1', 10);
         const cs = parseInt(anchorCell.getAttribute('colspan') || '1', 10);
         splitBtn.disabled = (rs <= 1 && cs <= 1);
      } else {
         splitBtn.disabled = true;
      }
  }
}
