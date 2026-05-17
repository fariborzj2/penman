import { TableTransaction } from './TableTransaction.js';
import { TableSelectionManager } from './TableSelectionManager.js';
import { FloatingUI } from '../../ui/FloatingUI.js';
import { TableGrid } from './TableGrid.js';

import { TableMenu } from './TableMenu.js';
import { ColorPicker } from '../../ui/ColorPicker.js';
import { uniqueId } from '../../utils/uniqueId.js';
import { escapeHtml as escapeHTML } from '../../utils/html.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

export function setupTablePlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.table', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }


  // escapeHTML is imported from utils/html.js (aliased above)
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

          editor.ui.createFormModal({
              title: editor.i18n.t('plugins.table.properties'),
              fields: [
                  { type: 'text', name: 'width',       label: editor.i18n.t('plugins.table.widthLabel'),       value: currentWidth,       placeholder: editor.i18n.t('plugins.table.widthPlaceholder'),       dir: 'ltr' },
                  { type: 'text', name: 'border',      label: editor.i18n.t('plugins.table.borderLabel'),      value: currentBorder,      placeholder: editor.i18n.t('plugins.table.borderPlaceholder'),      dir: 'ltr' },
                  { type: 'text', name: 'borderColor', label: editor.i18n.t('plugins.table.borderColorLabel'), value: currentBorderColor, placeholder: editor.i18n.t('plugins.table.borderColorPlaceholder'), dir: 'ltr' },
                  { type: 'text', name: 'cellPadding', label: editor.i18n.t('plugins.table.cellPaddingLabel'), value: currentCellPadding, placeholder: editor.i18n.t('plugins.table.cellPaddingPlaceholder'), dir: 'ltr' },
                  { type: 'text', name: 'cellSpacing', label: editor.i18n.t('plugins.table.cellSpacingLabel'), value: currentCellSpacing, placeholder: editor.i18n.t('plugins.table.cellSpacingPlaceholder'), dir: 'ltr' },
                  {
                      type: 'select', name: 'dir',
                      label: editor.i18n.t('plugins.table.directionLabel'),
                      value: currentDir,
                      options: [
                          { value: '',    label: editor.i18n.t('plugins.table.defaultDir') },
                          { value: 'ltr', label: editor.i18n.t('plugins.table.ltr') },
                          { value: 'rtl', label: editor.i18n.t('plugins.table.rtl') }
                      ]
                  },
                  {
                      type: 'select', name: 'textAlign',
                      label: editor.i18n.t('plugins.table.alignmentLabel'),
                      value: currentAlign,
                      options: [
                          { value: 'left',   label: editor.i18n.t('plugins.table.alignLeft') },
                          { value: 'center', label: editor.i18n.t('plugins.table.alignCenter') },
                          { value: 'right',  label: editor.i18n.t('plugins.table.alignRight') }
                      ]
                  }
              ],
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

  // Tear down plugin-owned state on editor destroy.
  editor.on('destroy', () => {
    if (floatingUI && typeof floatingUI.destroy === 'function') {
      floatingUI.destroy();
      floatingUI = null;
    }
    if (selectionManager && typeof selectionManager.destroy === 'function') {
      selectionManager.destroy();
    }
    editor.tableSelectionManager = null;
  });

  // 2. Setup Commands
  editor.commands.register('INSERT_TABLE', {
    execute: (editor, { rows = 2, cols = 2 } = {}) => {
      const tableId = uniqueId('t-');

      // No default border colors/widths or padding on cells. Tables get their
      // theme-aware border from penman-content.css (.penman-editor-area table,
      // td, th). Users can still override per-table via the Properties modal,
      // which writes its own attributes.

      let headerRow = '<tr>';
      for (let c = 0; c < cols; c++) {
        headerRow += `<th data-cell-id="${uniqueId('c-')}"><p><br></p></th>`;
      }
      headerRow += '</tr>';

      let bodyRows = '';
      for (let r = 1; r < rows; r++) {
        bodyRows += '<tr>';
        for (let c = 0; c < cols; c++) {
          bodyRows += `<td data-cell-id="${uniqueId('c-')}"><p><br></p></td>`;
        }
        bodyRows += '</tr>';
      }

      const html =
        `<table data-table-id="${tableId}">` +
          `<thead>${headerRow}</thead>` +
          `<tbody>${bodyRows}</tbody>` +
        `</table>`;

      editor.insertContent(html);
    }
  });

  editor.commands.register('SELECT_TABLE', {
    execute: (editor) => {
        const tableNode = selectionManager.activeTableNode;
        if (tableNode) {
            editor.selection.selectNode(tableNode);
            if (floatingUI) floatingUI.hide();
        }
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
               editor.ui.createFormModal({
                 title: editor.i18n.t('plugins.table.mergeError'),
                 fields: [
                   { type: 'html', html: `<p>${editor.i18n.t('plugins.table.mergeError')}</p>` }
                 ],
                 buttons: [{
                   text: editor.i18n.t('ui.ok') || 'OK',
                   classNames: 'penman-btn-primary',
                   onClick: (_e, modal) => modal.close()
                 }]
               });
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
      // `text` is what UIManager uses for the tooltip / aria-label. We still
      // want the icon (not the text) to be visible on the button, so we pass
      // `icon` explicitly to bypass the text-as-icon fallback in UIManager.
      text: editor.i18n.t('plugins.table.title'),
      icon: editor.ui.iconProvider.getIcon('table'),
      content: tableMenu.getHTML(),
      onOpen: (dropdown) => {
          // Save selection so it isn't lost when interacting with the dropdown
          editor.selection.save();

          tableMenu.bindEvents(dropdown.panelElement, selectionManager);

          // Disable the 4 parent group buttons (Cell / Row / Column / Table)
          // when the caret isn't inside a table. They are flyout triggers,
          // so disabling the trigger also prevents the side-panel from
          // opening. A data-tooltip via the shared Tooltip service explains
          // why the item is greyed out.
          const isTableActive = !!selectionManager.activeTableNode;
          const reasonNotInTable = editor.i18n.t('plugins.table.disabledReasonNoTable');
          const flyoutContainers = dropdown.panelElement.querySelectorAll(
              '.penman-menu-flyout.penman-menu-item--contextual'
          );
          flyoutContainers.forEach(container => {
              const trigger = container.querySelector('.penman-menu-flyout-trigger');
              if (isTableActive) {
                  container.classList.remove('penman-menu-item--disabled');
                  if (trigger) {
                      trigger.disabled = false;
                      trigger.removeAttribute('aria-disabled');
                      trigger.removeAttribute('data-tooltip');
                  }
              } else {
                  container.classList.add('penman-menu-item--disabled');
                  if (trigger) {
                      trigger.disabled = true;
                      trigger.setAttribute('aria-disabled', 'true');
                      trigger.setAttribute('data-tooltip', reasonNotInTable);
                      trigger.setAttribute('data-tooltip-placement', 'top');
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

          // Clear node selection if we are selecting cells
          editor.selection.clearNodeSelection();
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
     const selectedNode = editor.selection.getSelectedNode();
     if (selectedNode && selectedNode.tagName === 'TABLE') {
         if (!floatingUI) createFloatingUI();
         selectionManager.activeTableNode = selectedNode;
         selectionManager.selectedCellIds = [];

         floatingUI.setAnchor(selectedNode);
         floatingUI.show();
         updateFloatingUIButtons();
         return;
     }

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

           <button type="button" class="penman-btn penman-btn-table-prop" title="${editor.i18n.t('plugins.table.properties')}" style="padding: 4px; display:flex; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
           <button type="button" class="penman-btn penman-btn-del-table" title="${editor.i18n.t('plugins.table.deleteTable')}" style="padding: 4px; display:flex; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b5d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-select-table" title="${editor.i18n.t('plugins.table.selectTable')}" style="padding: 4px; display:flex; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/></svg>
           </button>


           <button type="button" class="penman-btn penman-btn-merge-cells" title="${editor.i18n.t('plugins.table.mergeCells')}" style="padding: 4px; display:none; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/><path d="M4 4h16v6H4z"/></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-split-cell" title="${editor.i18n.t('plugins.table.splitCell')}" style="padding: 4px; display:none; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M12 4v16"/><path d="M4 12h16"/></svg>
           </button>

           <div class="penman-btn-bg-color-wrapper" style="position:relative; display:flex;">
               <button type="button" class="penman-btn penman-btn-bg-color-trigger" title="${editor.i18n.t('plugins.table.cellBackgroundColor')}" style="padding: 4px; display:flex; align-items:center; ">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/></svg>
               </button>
           </div>

           <span style="width: 1px; height: 16px; background: #e0e0e0; margin: 0 2px;"></span>

           <button type="button" class="penman-btn penman-btn-add-row" title="${editor.i18n.t('plugins.table.insertRowBelow')}" style="padding: 4px; display:flex; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"/><path d="M3 9H21"/><path d="M10 15H14"/><path d="M12 13V17"/></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-remove-row" title="${editor.i18n.t('plugins.table.deleteRow')}" style="padding: 4px; display:flex; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"/><path d="M3 9H21"/><path d="M10 15H14"/></svg>
           </button>

           <span style="width: 1px; height: 16px; background: #e0e0e0; margin: 0 2px;"></span>

           <button type="button" class="penman-btn penman-btn-add-col" title="${editor.i18n.t('plugins.table.insertColRight')}" style="padding: 4px; display:flex; align-items:center;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"/><path d="M15 3V21"/><path d="M7 12H11"/><path d="M9 10V14"/></svg>
           </button>
           <button type="button" class="penman-btn penman-btn-remove-col" title="${editor.i18n.t('plugins.table.deleteCol')}" style="padding: 4px; display:flex; align-items:center; ">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"/><path d="M15 3V21"/><path d="M7 12H11"/></svg>
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

     const colorTrigger = floatingUI.element.querySelector('.penman-btn-bg-color-trigger');
     const colorWrapper = floatingUI.element.querySelector('.penman-btn-bg-color-wrapper');

     if (colorTrigger && colorWrapper) {
         let pickerInstance = null;

         colorTrigger.addEventListener('click', (e) => {
             e.preventDefault();
             // Toggle picker
             const existing = colorWrapper.querySelector('.penman-color-picker-container');
             if (existing) {
                 existing.remove();
                 return;
             }

             const container = document.createElement('div');
             container.className = 'penman-color-picker-container';
             container.style.position = 'absolute';
             container.style.top = '100%';
             container.style.left = '0';
             container.style.zIndex = '9999';
             container.style.marginTop = '5px';

             pickerInstance = new ColorPicker({
                 defaultColor: '#ffffff',
                 onChange: (hex, final) => {
                     editor.commands.execute('SET_CELL_PROPERTY', { property: 'backgroundColor', value: hex });
                     if (final) {
                         container.remove();
                     }
                 }
             });

             container.appendChild(pickerInstance.getElement());
             colorWrapper.appendChild(container);

             // Close on outside click
             const closePicker = (ce) => {
                 if (!container.contains(ce.target) && ce.target !== colorTrigger) {
                     container.remove();
                     document.removeEventListener('mousedown', closePicker);
                 }
             };
             setTimeout(() => document.addEventListener('mousedown', closePicker), 10);
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

     floatingUI.element.querySelector('.penman-btn-select-table').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.commands.execute('SELECT_TABLE');
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
                 editor.selection.clearNodeSelection();
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


  }
}
