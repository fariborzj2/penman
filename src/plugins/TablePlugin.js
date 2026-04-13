import { TableTransaction } from './table/TableTransaction.js';
import { TableSelectionManager } from './table/TableSelectionManager.js';
import { FloatingUI } from '../ui/FloatingUI.js';
import { TableGrid } from './table/TableGrid.js';

import { TableMenu } from './table/TableMenu.js';

export function setupTablePlugin(editor) {

  function escapeHTML(str) {
      if (!str) return '';
      return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }


  editor.commands.register('OPEN_TABLE_PROPERTIES_MODAL', {
      execute: (editor) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;

          const currentWidth = escapeHTML(tableNode.style.width || '');
          const currentBorder = escapeHTML(tableNode.getAttribute('border') || '');
          const currentBorderColor = escapeHTML(tableNode.getAttribute('bordercolor') || '');
          const currentCellPadding = escapeHTML(tableNode.getAttribute('cellpadding') || '');
          const currentCellSpacing = escapeHTML(tableNode.getAttribute('cellspacing') || '');
          const currentDir = escapeHTML(tableNode.getAttribute('dir') || '');
          const currentAlign = escapeHTML(tableNode.style.marginLeft === 'auto' ? (tableNode.style.marginRight === 'auto' ? 'center' : 'right') : 'left');

          editor.ui.createModal({
              title: 'Table Properties',
              body: `
                  <div class="penman-modal-form-row">
                      <label>Width:</label>
                      <input type="text" name="width" value="${currentWidth}" placeholder="e.g. 100% or 500px">
                  </div>
                  <div class="penman-modal-form-row">
                      <label>Border:</label>
                      <input type="text" name="border" value="${currentBorder}" placeholder="e.g. 1 or 0">
                  </div>
                  <div class="penman-modal-form-row">
                      <label>Border Color:</label>
                      <input type="text" name="borderColor" value="${currentBorderColor}" placeholder="e.g. #000 or red">
                  </div>
                  <div class="penman-modal-form-row">
                      <label>Cell Padding:</label>
                      <input type="text" name="cellPadding" value="${currentCellPadding}" placeholder="e.g. 5">
                  </div>
                  <div class="penman-modal-form-row">
                      <label>Cell Spacing:</label>
                      <input type="text" name="cellSpacing" value="${currentCellSpacing}" placeholder="e.g. 0">
                  </div>
                  <div class="penman-modal-form-row">
                      <label>Direction:</label>
                      <select name="dir">
                          <option value="" ${!currentDir ? 'selected' : ''}>Default</option>
                          <option value="ltr" ${currentDir === 'ltr' ? 'selected' : ''}>LTR</option>
                          <option value="rtl" ${currentDir === 'rtl' ? 'selected' : ''}>RTL</option>
                      </select>
                  </div>
                  <div class="penman-modal-form-row">
                      <label>Alignment:</label>
                      <select name="textAlign">
                          <option value="left" ${currentAlign === 'left' ? 'selected' : ''}>Left</option>
                          <option value="center" ${currentAlign === 'center' ? 'selected' : ''}>Center</option>
                          <option value="right" ${currentAlign === 'right' ? 'selected' : ''}>Right</option>
                      </select>
                  </div>
              `,
              onSubmit: (data) => {
                  const propsToSet = {};
                  if (data.width !== undefined) propsToSet.width = data.width;
                  if (data.border !== undefined) propsToSet.border = data.border;
                  if (data.borderColor !== undefined) propsToSet.borderColor = data.borderColor;
                  if (data.cellPadding !== undefined) propsToSet.cellPadding = data.cellPadding;
                  if (data.cellSpacing !== undefined) propsToSet.cellSpacing = data.cellSpacing;
                  if (data.dir !== undefined) propsToSet.dir = data.dir;
                  if (data.textAlign !== undefined) propsToSet.textAlign = data.textAlign;

                  editor.commands.execute('SET_TABLE_PROPERTIES', { properties: propsToSet });
              }
          });
      }
  });

  // 1. Setup Selection Manager
  const selectionManager = new TableSelectionManager(editor);
  editor.tableSelectionManager = selectionManager;
  let floatingUI = null;

  // 2. Setup Commands
  editor.commands.register('INSERT_TABLE', {
    execute: (editor, { rows = 2, cols = 2 } = {}) => {
      const tableId = 't-' + Math.random().toString(36).substr(2, 9);
      let html = `<table data-table-id="${tableId}" border="1" bordercolor="#ccc" style="width: 100%; border-collapse: collapse; border-style: solid;"><tbody>`;
      for(let r=0; r<rows; r++) {
         html += `<tr>`;
         for(let c=0; c<cols; c++) {
             html += `<td data-cell-id="c-${Math.random().toString(36).substr(2, 9)}" style="border: 1px solid #ccc; padding: 5px;"><br></td>`;
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

          // Disable context-sensitive buttons if no table is active
          const isTableActive = !!selectionManager.activeTableNode;

          const itemsToToggle = [
              '[data-cmd="table_delete"]',
              '.penman-menu-item-cell',
              '.penman-menu-item-row',
              '.penman-menu-item-column',
              '.penman-menu-item-props'
          ];

          itemsToToggle.forEach(selector => {
              const el = dropdown.panelElement.querySelector(selector);
              if (el) {
                  if (isTableActive) {
                      el.style.opacity = '1';
                      el.style.pointerEvents = 'auto';
                  } else {
                      el.style.opacity = '0.5';
                      el.style.pointerEvents = 'none';
                  }
              }
          });
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


  editor.commands.register('SET_TABLE_PROPERTIES', {
      execute: (editor, { properties }) => {
          const tableNode = selectionManager.activeTableNode;
          if (!tableNode) return;
          const tableId = tableNode.getAttribute('data-table-id');

          if (editor.history) {
              editor.history.pushImmediate();
          }

          const tx = new TableTransaction(editor, tableId);
          if (tx.begin()) {
              let success = true;
              for (const [prop, val] of Object.entries(properties)) {
                  if (!tx.setTableProperty(prop, val)) {
                      success = false;
                      break;
                  }
              }
              if (success) {
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

     // CRITICAL FIX: If we lose focus from the editor (e.g., clicking the toolbar), we should NOT wipe the table state.
     // Dropdowns and UI buttons need this state to know what to operate on.
     if (!sel || sel.rangeCount === 0) return;

     const node = sel.anchorNode;
     if (!node) return;

     // Ensure we are inside the editable area
     if (!editor.editableArea.contains(node)) {
         return;
     }

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


           <button type="button" class="penman-btn penman-btn-merge-cells" title="Merge Cells" style="padding: 4px; display:none; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/><path d="M4 4h16v6H4z"/></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-split-cell" title="Split Cell" style="padding: 4px; display:none; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M12 4v16"/><path d="M4 12h16"/></svg>
           </button>

           <div class="penman-btn-bg-color-wrapper" style="position:relative; display:flex;">
               <input type="color" class="penman-btn-bg-color-picker" title="Background Color" style="width: 26px; height: 26px; padding: 0; border: none; cursor: pointer; background: transparent; border-radius: 4px;" value="#ffffff">
           </div>

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
         tablePropBtn.addEventListener('click', (e) => {
             e.preventDefault();
             editor.commands.execute('OPEN_TABLE_PROPERTIES_MODAL');
             if (floatingUI) floatingUI.hide();
         });
     }



     floatingUI.element.querySelector('.penman-btn-merge-cells').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.commands.execute('MERGE_CELLS');
     });

     floatingUI.element.querySelector('.penman-btn-split-cell').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.commands.execute('SPLIT_CELL');
     });

     const colorPicker = floatingUI.element.querySelector('.penman-btn-bg-color-picker');
     if (colorPicker) {
         colorPicker.addEventListener('change', (e) => {
             editor.commands.execute('SET_CELL_PROPERTY', { property: 'backgroundColor', value: e.target.value });
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
      if (!floatingUI) return;
      const mergeBtn = floatingUI.element.querySelector('.penman-btn-merge-cells');
      const splitBtn = floatingUI.element.querySelector('.penman-btn-split-cell');

      if (!mergeBtn || !splitBtn) return;

      if (selectionManager.selectedCellIds.length > 1) {
          mergeBtn.style.display = 'flex';
          splitBtn.style.display = 'none';
      } else {
          mergeBtn.style.display = 'none';
          // Check if the single selected cell is merged
          let isMerged = false;
          if (anchorCell && (anchorCell.getAttribute('colspan') || anchorCell.getAttribute('rowspan'))) {
              isMerged = true;
          }
          if (isMerged) {
              splitBtn.style.display = 'flex';
          } else {
              splitBtn.style.display = 'none';
          }
      }

      const colorPicker = floatingUI.element.querySelector('.penman-btn-bg-color-picker');
      if (colorPicker && anchorCell) {
          // Attempt to get the current background color to prepopulate the picker
      }
  }
}
