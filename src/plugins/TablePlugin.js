import { TableTransaction } from './table/TableTransaction.js';
import { TableSelectionManager } from './table/TableSelectionManager.js';
import { FloatingUI } from '../ui/FloatingUI.js';
import { TableGrid } from './table/TableGrid.js';

import { TableMenu } from './table/TableMenu.js';

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
  const tableMenu = new TableMenu(editor);

  editor.ui.registry.addDropdown('table', {
      text: '', // No text, just icon as per standard toolbars
      icon: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v3h6V6H5zm8 0v3h6V6h-6zm-8 5v3h6v-3H5zm8 0v3h6v-3h-6zm-8 5v3h6v-3H5zm8 0v3h6v-3h-6z"/></svg>',
      content: tableMenu.getHTML(),
      onOpen: (dropdown) => {
          // Save selection so it isn't lost when interacting with the dropdown
          editor.selection.save();

          tableMenu.bindEvents(dropdown.panelElement, selectionManager);
          // Disable "Delete Table" if no table is active
          const deleteBtn = dropdown.panelElement.querySelector('[data-cmd="table_delete"]');
          if (selectionManager.activeTableNode) {
              deleteBtn.style.opacity = '1';
              deleteBtn.style.pointerEvents = 'auto';
          } else {
              deleteBtn.style.opacity = '0.5';
              deleteBtn.style.pointerEvents = 'none';
          }
      },
      onClose: () => {
          editor.selection.clearSaved();
      }
  });

  // Attach TableTransaction class to DELETE_TABLE command definition to access it inside the menu
  editor.commands.commands['DELETE_TABLE'] = { txClass: TableTransaction };

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

  // 5. Setup more commands for rows/columns
  editor.commands.register('ADD_ROW', {
      execute: (editor, { position = 'after' } = {}) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const tableId = tableNode.getAttribute('data-table-id');
          const cellIds = selectionManager.getSelectedCellIds();
          if (cellIds.length === 0) return;

          const tx = new TableTransaction(editor, tableId);
          if (tx.begin()) {
              if (tx.addRow(cellIds[0], position)) {
                  tx.commit();
              } else {
                  tx.rollback();
              }
          }
      }
  });

  editor.commands.register('REMOVE_ROW', {
      execute: (editor) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const tableId = tableNode.getAttribute('data-table-id');
          const cellIds = selectionManager.getSelectedCellIds();
          if (cellIds.length === 0) return;

          const tx = new TableTransaction(editor, tableId);
          if (tx.begin()) {
              if (tx.removeRow(cellIds[0])) {
                  tx.commit();
              } else {
                  tx.rollback();
              }
          }
      }
  });

  editor.commands.register('ADD_COLUMN', {
      execute: (editor, { position = 'after' } = {}) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const tableId = tableNode.getAttribute('data-table-id');
          const cellIds = selectionManager.getSelectedCellIds();
          if (cellIds.length === 0) return;

          const tx = new TableTransaction(editor, tableId);
          if (tx.begin()) {
              if (tx.addColumn(cellIds[0], position)) {
                  tx.commit();
              } else {
                  tx.rollback();
              }
          }
      }
  });

  editor.commands.register('REMOVE_COLUMN', {
      execute: (editor) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const tableId = tableNode.getAttribute('data-table-id');
          const cellIds = selectionManager.getSelectedCellIds();
          if (cellIds.length === 0) return;

          const tx = new TableTransaction(editor, tableId);
          if (tx.begin()) {
              if (tx.removeColumn(cellIds[0])) {
                  tx.commit();
              } else {
                  tx.rollback();
              }
          }
      }
  });

  editor.commands.register('SET_CELL_PROPERTY', {
      execute: (editor, { property, value }) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const cellIds = selectionManager.getSelectedCellIds();
          if (cellIds.length === 0) return;

          cellIds.forEach(id => {
              const cell = tableNode.querySelector(`[data-cell-id="${id}"]`);
              if (cell) {
                  if (property === 'backgroundColor') cell.style.backgroundColor = value;
              }
          });
          editor.emit('change', editor.getContent());
      }
  });

  // 6. Event Listeners for Selection and Floating UI
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
        <div class="penman-table-toolbar" style="background: white; border: 1px solid #e0e0e0; padding: 4px; border-radius: 6px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative;">
           <!-- Arrow Tail -->
           <div class="penman-floating-tail-inner" style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white; z-index: 2;"></div>
           <div class="penman-floating-tail-outer" style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 7px solid #e0e0e0; z-index: 1;"></div>

           <button type="button" class="penman-btn penman-btn-table-prop" title="Table Properties" style="padding: 4px; display:flex; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-del-table" title="Delete Table" style="padding: 4px; display:flex; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
           </button>

           <span style="width: 1px; height: 16px; background: #e0e0e0; margin: 0 2px;"></span>

           <button type="button" class="penman-btn penman-btn-add-row" title="Add Row Below" style="padding: 4px; display:flex; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line><line x1="12" y1="12" x2="12" y2="18"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-remove-row" title="Delete Row" style="padding: 4px; display:flex; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
           </button>

           <span style="width: 1px; height: 16px; background: #e0e0e0; margin: 0 2px;"></span>

           <button type="button" class="penman-btn penman-btn-add-col" title="Add Column Right" style="padding: 4px; display:flex; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line><line x1="15" y1="9" x2="15" y2="15"></line><line x1="12" y1="12" x2="18" y2="12"></line></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-remove-col" title="Delete Column" style="padding: 4px; display:flex; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line><line x1="12" y1="12" x2="18" y2="12"></line></svg>
           </button>
        </div>
     `;
     floatingUI.mount(html);

     // Bind buttons
     const tablePropBtn = floatingUI.element.querySelector('.penman-btn-table-prop');
     if(tablePropBtn) {
         tablePropBtn.addEventListener('mousedown', (e) => {
             e.preventDefault();
         });
     }

     floatingUI.element.querySelector('.penman-btn-add-row').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.execCommand('ADD_ROW', { position: 'after' });
     });

     floatingUI.element.querySelector('.penman-btn-remove-row').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.execCommand('REMOVE_ROW');
     });

     floatingUI.element.querySelector('.penman-btn-add-col').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.execCommand('ADD_COLUMN', { position: 'after' });
     });

     floatingUI.element.querySelector('.penman-btn-remove-col').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.execCommand('REMOVE_COLUMN');
     });

     floatingUI.element.querySelector('.penman-btn-del-table').addEventListener('mousedown', (e) => {
         e.preventDefault();
         const tableNode = selectionManager.activeTableNode;
         if (tableNode) {
             const tx = new TableTransaction(editor, tableNode.getAttribute('data-table-id'));
             if (tx.begin()) {
                 tx.deleteTable();
                 tx.commit();
                 selectionManager.clearSelection();
             }
         }
     });
  }

  function updateFloatingUIButtons(anchorCell) {
      // Nothing needs updating dynamically in this simplified layout unless required
  }
}
