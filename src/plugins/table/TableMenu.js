/**
 * TableMenu.js
 * Generates the HTML string and bindings for the 10x10 Table Grid dropdown.
 */
export class TableMenu {
  constructor(editor) {
    this.editor = editor;
  }

  getHTML() {
    let gridHTML = '<div class="penman-table-grid" style="display: grid; grid-template-columns: repeat(10, 15px); gap: 2px; padding: 10px;">';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        gridHTML += `<div class="penman-grid-cell" data-row="${r + 1}" data-col="${c + 1}" style="width: 15px; height: 15px; border: 1px solid #ccc; cursor: pointer; background: #fff;"></div>`;
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
          <div class="penman-menu-item" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
             Cell <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="penman-menu-item" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
             Row <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="penman-menu-item" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
             Column <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 5px 0;">
          <div class="penman-menu-item" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #777;">
            Table properties
          </div>
          <div class="penman-menu-item penman-cmd-trigger" data-cmd="table_delete" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <div style="border: 1px solid #777; border-radius: 2px; width: 14px; height: 14px; display:flex; align-items:center; justify-content:center;">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#777" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
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
        this.editor.execCommand('INSERT_TABLE', { rows: r, cols: c });
        // Close dropdown natively
        const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
        if(instance) instance.close();
      });
    });

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

    // Add hover states for menu items
    const menuItems = dropdownElement.querySelectorAll('.penman-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('mouseover', () => item.style.backgroundColor = '#f5f5f5');
        item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');
    });
  }
}
