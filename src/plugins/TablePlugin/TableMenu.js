/**
 * TableMenu.js
 *
 * Compact table-toolbar dropdown with cascading submenus:
 *
 *   ┌─────────────────────────────┐
 *   │ INSERT TABLE                │
 *   │  ┌──────10×10 grid──────┐   │
 *   │  └──── "2 × 3" label ───┘   │
 *   ├─────────────────────────────┤
 *   │ ⊞ Cell           ›          │ ──► [Merge, Split]
 *   │ ☰ Row            ›          │ ──► [Insert above / below, Delete row]
 *   │ ☷ Column         ›          │ ──► [Insert left / right, Delete column]
 *   │ ▦ Table          ›          │ ──► [Properties, Select, Delete table]
 *   └─────────────────────────────┘
 *
 * Each parent item is a button that opens a side-flyout on hover/focus.
 * All styling lives in penman-ui.css; this file emits only structural HTML
 * and binds events.
 */

const ICONS = {
  // Parent-group icons
  cellGroup:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>',
  rowGroup:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
  colGroup:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
  tableGroup:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',

  // Action icons
  merge:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 18l-3-3 3-3"/><path d="M16 6l3 3-3 3"/><path d="M5 15h6"/><path d="M13 9h6"/></svg>',
  split:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>',
  rowAbove:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="6" x="3" y="13" rx="1"/><path d="M12 10V3"/><path d="M9 6l3-3 3 3"/></svg>',
  rowBelow:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="6" x="3" y="5" rx="1"/><path d="M12 14v7"/><path d="M9 18l3 3 3-3"/></svg>',
  rowDelete:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="6" x="3" y="9" rx="1"/><path d="m17 21-3-3 3-3"/><path d="m14 18 7 0"/></svg>',
  colLeft:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="6" height="18" x="13" y="3" rx="1"/><path d="M10 12H3"/><path d="M6 9l-3 3 3 3"/></svg>',
  colRight:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="6" height="18" x="5" y="3" rx="1"/><path d="M14 12h7"/><path d="M18 9l3 3-3 3"/></svg>',
  colDelete:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="6" height="18" x="9" y="3" rx="1"/><path d="m17 21-3-3 3-3"/><path d="m14 18 7 0"/></svg>',
  properties:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  selectTable:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  deleteTable:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>',
  chevron:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
};

export class TableMenu {
  constructor(editor) {
    this.editor = editor;
  }

  /** Single leaf action — gets executed on click. */
  _action(cmd, labelKey, icon) {
    return `
      <button type="button" class="penman-menu-action" data-cmd="${cmd}">
        <span class="penman-menu-action-icon">${icon}</span>
        <span class="penman-menu-action-label">${this.editor.i18n.t(labelKey)}</span>
      </button>
    `;
  }

  /** Parent flyout — wraps a trigger button + its side-panel children. */
  _flyout(name, labelKey, icon, children) {
    return `
      <div class="penman-menu-flyout penman-menu-item--contextual" data-flyout="${name}">
        <button type="button" class="penman-menu-action penman-menu-flyout-trigger" aria-haspopup="menu" aria-expanded="false">
          <span class="penman-menu-action-icon">${icon}</span>
          <span class="penman-menu-action-label">${this.editor.i18n.t(labelKey)}</span>
          <span class="penman-menu-flyout-chevron">${ICONS.chevron}</span>
        </button>
        <div class="penman-menu-flyout-panel" role="menu">
          ${children}
        </div>
      </div>
    `;
  }

  getHTML() {
    const i18n = this.editor.i18n;

    let gridHTML = '<div class="penman-table-grid">';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        gridHTML += `<div class="penman-grid-cell" data-row="${r + 1}" data-col="${c + 1}"></div>`;
      }
    }
    gridHTML += '</div>';

    const cellChildren =
      this._action('MERGE_CELLS', 'plugins.table.mergeCells', ICONS.merge) +
      this._action('SPLIT_CELL',  'plugins.table.splitCell',  ICONS.split);

    const rowChildren =
      this._action('ADD_ROW_BEFORE', 'plugins.table.insertRowAbove', ICONS.rowAbove)  +
      this._action('ADD_ROW_AFTER',  'plugins.table.insertRowBelow', ICONS.rowBelow)  +
      this._action('REMOVE_ROW',     'plugins.table.deleteRow',      ICONS.rowDelete);

    const colChildren =
      this._action('ADD_COLUMN_BEFORE', 'plugins.table.insertColLeft',  ICONS.colLeft)  +
      this._action('ADD_COLUMN_AFTER',  'plugins.table.insertColRight', ICONS.colRight) +
      this._action('REMOVE_COLUMN',     'plugins.table.deleteCol',      ICONS.colDelete);

    const tableChildren =
      this._action('OPEN_TABLE_PROPERTIES_MODAL', 'plugins.table.properties',  ICONS.properties)  +
      this._action('SELECT_TABLE',                'plugins.table.selectTable', ICONS.selectTable) +
      this._action('DELETE_TABLE',                'plugins.table.deleteTable', ICONS.deleteTable);

    return `
      <div class="penman-table-menu">

        <div class="penman-table-insert-mode">
          <div class="penman-menu-section-title">${i18n.t('plugins.table.title')}</div>
          ${gridHTML}
          <div class="penman-grid-label">0 × 0</div>
        </div>

        <hr>

        <div class="penman-table-menu-actions">
          ${this._flyout('cell',   'plugins.table.cell',   ICONS.cellGroup,  cellChildren)}
          ${this._flyout('row',    'plugins.table.row',    ICONS.rowGroup,   rowChildren)}
          ${this._flyout('column', 'plugins.table.column', ICONS.colGroup,   colChildren)}
          ${this._flyout('table',  'plugins.table.title',  ICONS.tableGroup, tableChildren)}
        </div>
      </div>
    `;
  }

  bindEvents(dropdownElement, selectionManager) {
    if (dropdownElement.__eventsBound) return;
    dropdownElement.__eventsBound = true;

    // ── Grid hover-picker (delegated, 2 listeners total — not 200) ──────
    const grid = dropdownElement.querySelector('.penman-table-grid');
    const gridContainer = dropdownElement.querySelector('.penman-table-insert-mode');
    const label = dropdownElement.querySelector('.penman-grid-label');
    const gridCells = dropdownElement.querySelectorAll('.penman-grid-cell');

    const updateGrid = (r, c) => {
      for (const cell of gridCells) {
        const cellR = parseInt(cell.getAttribute('data-row'), 10);
        const cellC = parseInt(cell.getAttribute('data-col'), 10);
        cell.classList.toggle('penman-grid-cell--selected', cellR <= r && cellC <= c);
      }
      label.textContent = `${r} × ${c}`;
    };

    if (grid) {
      // Single delegated mouseover on the grid container instead of one per cell.
      grid.addEventListener('mouseover', (e) => {
        const cell = e.target.closest && e.target.closest('.penman-grid-cell');
        if (!cell) return;
        const r = parseInt(cell.getAttribute('data-row'), 10);
        const c = parseInt(cell.getAttribute('data-col'), 10);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;
        updateGrid(r, c);
      });
      grid.addEventListener('click', (e) => {
        const cell = e.target.closest && e.target.closest('.penman-grid-cell');
        if (!cell) return;
        const r = parseInt(cell.getAttribute('data-row'), 10);
        const c = parseInt(cell.getAttribute('data-col'), 10);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;
        this.editor.selection.restore();
        this.editor.execCommand('INSERT_TABLE', { rows: r, cols: c });
        const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
        if (instance) instance.close();
      });
    }
    if (gridContainer) {
      gridContainer.addEventListener('mouseleave', () => updateGrid(0, 0));
    }

    // ── Flyout triggers (parent group buttons) ───────────────────────────
    // Hover OR keyboard focus opens; click toggles. ESC and clicking outside
    // close. Only one flyout can be open at a time.
    const flyouts = dropdownElement.querySelectorAll('.penman-menu-flyout');
    const closeAllFlyouts = (except) => {
      flyouts.forEach(f => {
        if (f !== except) {
          f.classList.remove('penman-menu-flyout--open');
          const t = f.querySelector('.penman-menu-flyout-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
    };
    const openFlyout = (f) => {
      if (f.classList.contains('penman-menu-item--disabled')) return;
      closeAllFlyouts(f);
      f.classList.add('penman-menu-flyout--open');
      const t = f.querySelector('.penman-menu-flyout-trigger');
      if (t) t.setAttribute('aria-expanded', 'true');
    };

    flyouts.forEach(f => {
      const trigger = f.querySelector('.penman-menu-flyout-trigger');
      // Mouse: open on hover into the row, close when leaving the entire flyout area.
      f.addEventListener('mouseenter', () => openFlyout(f));
      f.addEventListener('mouseleave', () => {
        f.classList.remove('penman-menu-flyout--open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
      // Keyboard: click/Enter on trigger toggles.
      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (trigger.disabled) return;
          if (f.classList.contains('penman-menu-flyout--open')) {
            f.classList.remove('penman-menu-flyout--open');
            trigger.setAttribute('aria-expanded', 'false');
          } else {
            openFlyout(f);
          }
        });
      }
    });

    // ── Leaf actions ─────────────────────────────────────────────────────
    const actions = dropdownElement.querySelectorAll('.penman-menu-action:not(.penman-menu-flyout-trigger)');
    actions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.disabled) return;
        const cmd = btn.getAttribute('data-cmd');
        if (!cmd) return;

        if (cmd === 'ADD_ROW_BEFORE')         this.editor.commands.execute('ADD_ROW',    { position: 'before' });
        else if (cmd === 'ADD_ROW_AFTER')     this.editor.commands.execute('ADD_ROW',    { position: 'after'  });
        else if (cmd === 'ADD_COLUMN_BEFORE') this.editor.commands.execute('ADD_COLUMN', { position: 'before' });
        else if (cmd === 'ADD_COLUMN_AFTER')  this.editor.commands.execute('ADD_COLUMN', { position: 'after'  });
        else if (cmd === 'DELETE_TABLE') {
          const tableNode = selectionManager.activeTableNode;
          if (tableNode) {
            const tx = new this.editor.commands.commands['DELETE_TABLE'].txClass(this.editor, tableNode.getAttribute('data-table-id'));
            if (tx.begin()) {
              tx.deleteTable();
              tx.commit();
              selectionManager.clearSelection();
            }
          }
        } else {
          this.editor.commands.execute(cmd);
        }

        const instance = dropdownElement.closest('.penman-dropdown').__dropdownInstance;
        if (instance) instance.close();
      });
    });
  }
}
