/**
 * TableMenu.js
 * Generates the HTML string and bindings for the 10x10 Table Grid dropdown.
 */
export class TableMenu {
  constructor(editor) {
    this.editor = editor;
  }

  getHTML() {
    let gridHTML = '<div class="penman-table-grid">';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        gridHTML += `<div class="penman-grid-cell" data-row="${r + 1}" data-col="${c + 1}" style="border: 1px solid #ccc; cursor: pointer; background: #fff;"></div>`;
      }
    }
    gridHTML += '</div>';
    gridHTML += '<div class="penman-grid-label" style="text-align: center; font-size: 12px; padding-bottom: 5px; color: #666;">0x0</div>';

    return `
      <div class="penman-table-menu" style="min-width: 200px;">
        <div class="penman-table-insert-mode">
          ${gridHTML}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 5px 0;">
        <div class="penman-table-menu-list" style="color: #333;">

          <!-- CELL -->
          <details class="penman-menu-item-cell">
            <summary style="padding: 8px 15px; cursor: pointer; font-size: 14px; outline: none;">Cell</summary>
            <div style="padding-left: 20px; font-size: 13px;">
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="MERGE_CELLS" style="padding: 6px; cursor: pointer;">Merge cells</div>
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="SPLIT_CELL" style="padding: 6px; cursor: pointer;">Split cell</div>
            </div>
          </details>

          <!-- ROW -->
          <details class="penman-menu-item-row">
            <summary style="padding: 8px 15px; cursor: pointer; font-size: 14px; outline: none;">Row</summary>
            <div style="padding-left: 20px; font-size: 13px;">
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="ADD_ROW_BEFORE" style="padding: 6px; cursor: pointer;">Insert row before</div>
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="ADD_ROW_AFTER" style="padding: 6px; cursor: pointer;">Insert row after</div>
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="REMOVE_ROW" style="padding: 6px; cursor: pointer;">Delete row</div>
            </div>
          </details>

          <!-- COLUMN -->
          <details class="penman-menu-item-column">
            <summary style="padding: 8px 15px; cursor: pointer; font-size: 14px; outline: none;">Column</summary>
            <div style="padding-left: 20px; font-size: 13px;">
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="ADD_COLUMN_BEFORE" style="padding: 6px; cursor: pointer;">Insert column before</div>
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="ADD_COLUMN_AFTER" style="padding: 6px; cursor: pointer;">Insert column after</div>
                <div class="penman-menu-subitem penman-cmd-trigger" data-cmd="REMOVE_COLUMN" style="padding: 6px; cursor: pointer;">Delete column</div>
            </div>
          </details>

          <hr style="border: none; border-top: 1px solid #eee; margin: 5px 0;">
          <div class="penman-menu-item penman-menu-item-props" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #777;">
            Table properties
          </div>
          <div class="penman-menu-item penman-cmd-trigger" data-cmd="table_delete" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <div >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-x-icon lucide-square-x"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            </div>
            <span style="color: #777;">Delete table</span>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(dropdownElement, selectionManager) {
    if (dropdownElement.__eventsBound) return;
    dropdownElement.__eventsBound = true;

    const gridCells = dropdownElement.querySelectorAll('.penman-grid-cell');
    const label = dropdownElement.querySelector('.penman-grid-label');

    const updateGrid = (r, c) => {
      gridCells.forEach(cell => {
        const cellR = parseInt(cell.getAttribute('data-row'), 10);
        const cellC = parseInt(cell.getAttribute('data-col'), 10);
        if (cellR <= r && cellC <= c) {
          cell.style.background = '#e3f2fd';
          cell.style.borderColor = '#90caf9';
        } else {
          cell.style.background = '#fff';
          cell.style.borderColor = '#ccc';
        }
      });
      label.textContent = `${r}x${c}`;
    };

    gridCells.forEach(cell => {
      cell.addEventListener('mouseover', (e) => {
        const r = parseInt(e.target.getAttribute('data-row'), 10);
        const c = parseInt(e.target.getAttribute('data-col'), 10);
        updateGrid(r, c);
      });
      // Ensure hover clears if leaving the grid
      const gridContainer = dropdownElement.querySelector('.penman-table-insert-mode');
      gridContainer.addEventListener('mouseleave', () => {
         updateGrid(0, 0);
      });

      cell.addEventListener('click', (e) => {
        const r = parseInt(e.target.getAttribute('data-row'), 10);
        const c = parseInt(e.target.getAttribute('data-col'), 10);

        // Ensure the selection is restored before inserting the table HTML
        this.editor.selection.restore();

        this.editor.execCommand('INSERT_TABLE', { rows: r, cols: c });
        // Close dropdown natively
        const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
        if(instance) instance.close();
      });
    });


    const tablePropItem = Array.from(dropdownElement.querySelectorAll('.penman-menu-item')).find(el => el.textContent.includes('Table properties'));
    if (tablePropItem) {
        tablePropItem.addEventListener('click', () => {
            this.editor.commands.execute('OPEN_TABLE_PROPERTIES_MODAL');
            const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
            if(instance) instance.close();
        });
    }

    const deleteBtn = dropdownElement.querySelector('[data-cmd="table_delete"]');

    deleteBtn.addEventListener('click', () => {
       const tableNode = selectionManager.activeTableNode;
       if (tableNode) {
           const tx = new this.editor.commands.commands['DELETE_TABLE'].txClass(this.editor, tableNode.getAttribute('data-table-id'));
           if (tx.begin()) {
              tx.deleteTable();
              tx.commit();
              selectionManager.clearSelection();
           }
       }
       const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
       if(instance) instance.close();
    });


    // Bind subitems
    const subitems = dropdownElement.querySelectorAll('.penman-menu-subitem');
    subitems.forEach(item => {
        item.addEventListener('mouseover', () => item.style.backgroundColor = '#f5f5f5');
        item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');

        item.addEventListener('click', (e) => {
            const cmd = e.target.getAttribute('data-cmd');
            if (!cmd) return;

            // Map the detailed UI commands to the engine commands
            if (cmd === 'ADD_ROW_BEFORE') {
                this.editor.commands.execute('ADD_ROW', { position: 'before' });
            } else if (cmd === 'ADD_ROW_AFTER') {
                this.editor.commands.execute('ADD_ROW', { position: 'after' });
            } else if (cmd === 'ADD_COLUMN_BEFORE') {
                this.editor.commands.execute('ADD_COLUMN', { position: 'before' });
            } else if (cmd === 'ADD_COLUMN_AFTER') {
                this.editor.commands.execute('ADD_COLUMN', { position: 'after' });
            } else {
                this.editor.commands.execute(cmd);
            }

            const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
            if(instance) instance.close();
        });
    });

    // Add hover states for menu items
    const menuItems = dropdownElement.querySelectorAll('.penman-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('mouseover', () => item.style.backgroundColor = '#f5f5f5');
        item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');
    });
  }
}
