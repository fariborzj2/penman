import { Dropdown } from './Dropdown.js';
import { uniqueId } from '../utils/uniqueId.js';

/**
 * DropdownMenu — a declarative dropdown panel layered on Dropdown.js.
 *
 * Plugins describe their menu with an `items` schema; DropdownMenu renders
 * consistent HTML (search bar, sections, items, dividers, custom panels)
 * and handles selection, search filtering, and active-state styling.
 *
 * ─── Supported item types ─────────────────────────────────────────────────
 *
 *   item       — clickable row
 *     { type: 'item', label, icon?, hint?, active?, disabled?,
 *       value?, onAction: (value, menu) => void }
 *
 *   separator  — horizontal divider
 *     { type: 'separator' }
 *
 *   header     — non-clickable section title in-line
 *     { type: 'header', label }
 *
 *   section    — grouped items under a heading
 *     { type: 'section', title?, items: [...] }
 *
 *   custom     — escape hatch; render returns a DOM node
 *     { type: 'custom', render: (menu) => HTMLElement }
 *
 * ─── Optional features ────────────────────────────────────────────────────
 *
 *   searchable: true        adds a search input at the top of the panel that
 *                           filters items by label substring (case-insensitive).
 *   searchPlaceholder       text shown in the search box.
 *   width                   CSS width applied to the panel (e.g. '240px').
 *
 * ─── Output ───────────────────────────────────────────────────────────────
 *
 *   When an item is clicked DropdownMenu calls `onAction(value, menu)` on the
 *   item, then closes the panel unless the handler called `menu.keepOpen()`.
 */
export class DropdownMenu {
  /**
   * @param {Object} options - The menu config (see class docs).
   * @param {Object} [editor] - Optional editor reference (used for i18n only).
   */
  constructor(options, editor = null) {
    this.options = {
      items: [],
      searchable: false,
      searchPlaceholder: 'Search...',
      width: null,
      ...options
    };
    this.editor = editor;
    this._panel = null;
    this._keepOpen = false;
    this._search = '';
  }

  /**
   * Build and return the panel HTMLElement to feed into Dropdown's `content`.
   */
  render() {
    this._panel = document.createElement('div');
    this._panel.className = 'penman-dropdown-menu';
    if (this.options.width) this._panel.style.width = this.options.width;

    if (this.options.searchable) this._renderSearch(this._panel);

    this._itemsContainer = document.createElement('div');
    this._itemsContainer.className = 'penman-dropdown-menu-items';
    this._panel.appendChild(this._itemsContainer);

    this._renderItems(this.options.items, this._itemsContainer);
    return this._panel;
  }

  /**
   * Update the items list and re-render. Useful when a plugin wants to
   * refresh items reactively (e.g. on selection change).
   */
  setItems(items) {
    this.options.items = items || [];
    if (this._itemsContainer) {
      this._itemsContainer.innerHTML = '';
      this._renderItems(this.options.items, this._itemsContainer);
    }
  }

  /**
   * Called by an item's onAction to prevent the dropdown from closing
   * after the action runs.
   */
  keepOpen() { this._keepOpen = true; }

  // ── private ────────────────────────────────────────────────────────────

  _renderSearch(parent) {
    const wrap = document.createElement('div');
    wrap.className = 'penman-dropdown-menu-search';
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'penman-dropdown-menu-search-input';
    input.placeholder = this.options.searchPlaceholder || '';
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('input', (e) => {
      this._search = e.target.value.trim().toLowerCase();
      this._itemsContainer.innerHTML = '';
      this._renderItems(this.options.items, this._itemsContainer);
    });
    wrap.appendChild(input);
    parent.appendChild(wrap);
    this._searchInput = input;
  }

  _matchesSearch(label) {
    if (!this._search) return true;
    return (label || '').toLowerCase().includes(this._search);
  }

  _renderItems(items, parent) {
    let lastWasSeparator = true; // prevent leading separators
    let anyShown = false;
    for (const item of items) {
      const rendered = this._renderItem(item, parent, lastWasSeparator);
      if (rendered === 'separator') lastWasSeparator = true;
      else if (rendered === true) { lastWasSeparator = false; anyShown = true; }
    }
    if (!anyShown && this._search) {
      const empty = document.createElement('div');
      empty.className = 'penman-dropdown-menu-empty';
      empty.textContent = this.options.emptyText
        || (this.editor && this.editor.i18n ? this.editor.i18n.t('ui.no_results') : 'No results');
      parent.appendChild(empty);
    }
  }

  _renderItem(item, parent, lastWasSeparator) {
    switch (item.type) {
      case 'separator': {
        if (lastWasSeparator) return false;
        const sep = document.createElement('div');
        sep.className = 'penman-dropdown-menu-separator';
        parent.appendChild(sep);
        return 'separator';
      }
      case 'header': {
        if (!this._matchesSearch(item.label)) return false;
        const h = document.createElement('div');
        h.className = 'penman-dropdown-menu-header';
        h.textContent = item.label || '';
        parent.appendChild(h);
        return true;
      }
      case 'section': {
        // Filter children first to know whether to show the title.
        const visible = (item.items || []).filter(child => this._isItemVisible(child));
        if (visible.length === 0) return false;
        if (item.title) {
          const t = document.createElement('div');
          t.className = 'penman-dropdown-menu-section-title';
          t.textContent = item.title;
          parent.appendChild(t);
        }
        for (const child of item.items || []) this._renderItem(child, parent, false);
        return true;
      }
      case 'custom': {
        const el = typeof item.render === 'function' ? item.render(this) : null;
        if (el instanceof HTMLElement) parent.appendChild(el);
        return true;
      }
      default: { // 'item' or unspecified
        if (!this._matchesSearch(item.label)) return false;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'penman-dropdown-menu-item';
        row.setAttribute('role', 'menuitem');
        if (item.active) {
          row.classList.add('penman-dropdown-menu-item--active');
          row.setAttribute('aria-checked', 'true');
        }
        if (item.disabled) {
          row.disabled = true;
          row.classList.add('penman-dropdown-menu-item--disabled');
          row.setAttribute('aria-disabled', 'true');
        }
        // Optional inline style (object map) applied to the row itself.
        // Useful for previews like font-size dropdowns where each item should
        // render in its own visual size.
        if (item.style && typeof item.style === 'object') {
          Object.assign(row.style, item.style);
        }
        // icon (raw SVG/HTML string or DOM node)
        if (item.icon) {
          const icon = document.createElement('span');
          icon.className = 'penman-dropdown-menu-item-icon';
          if (typeof item.icon === 'string') icon.innerHTML = item.icon;
          else if (item.icon instanceof HTMLElement) icon.appendChild(item.icon);
          row.appendChild(icon);
        }
        // label — three flavours, picked in priority order:
        //   1. renderLabel(menu): function returning a DOM element (richest)
        //   2. labelHTML: pre-built HTML string
        //   3. label: plain text (default)
        const label = document.createElement('span');
        label.className = 'penman-dropdown-menu-item-label';
        if (typeof item.renderLabel === 'function') {
          const el = item.renderLabel(this);
          if (el instanceof HTMLElement) label.appendChild(el);
          else if (typeof el === 'string') label.innerHTML = el;
        } else if (typeof item.labelHTML === 'string') {
          label.innerHTML = item.labelHTML;
        } else {
          label.textContent = item.label || '';
        }
        row.appendChild(label);
        // optional hint on the trailing edge (e.g. shortcut)
        if (item.hint) {
          const hint = document.createElement('span');
          hint.className = 'penman-dropdown-menu-item-hint';
          hint.textContent = item.hint;
          row.appendChild(hint);
        }
        row.addEventListener('mousedown', (e) => e.preventDefault());
        row.addEventListener('click', (e) => {
          e.preventDefault();
          if (item.disabled) return;
          this._keepOpen = false;
          if (typeof item.onAction === 'function') {
            item.onAction(item.value, this);
          }
          if (!this._keepOpen) {
            // Bubble a close request to the parent Dropdown.
            document.body.click();
          }
        });
        parent.appendChild(row);
        return true;
      }
    }
  }

  _isItemVisible(item) {
    if (!item) return false;
    if (item.type === 'separator' || item.type === 'custom') return true;
    if (item.type === 'section') {
      return (item.items || []).some(child => this._isItemVisible(child));
    }
    return this._matchesSearch(item.label);
  }
}

/**
 * Convenience factory used by plugins: build a DropdownMenu instance and
 * return its rendered panel element ready to feed into `addDropdown(...).render`.
 *
 * @example
 *   editor.ui.registry.addDropdown('blocktype', {
 *     text: editor.i18n.t('plugins.blockType.paragraph'),
 *     render: () => buildDropdownMenu(editor, { searchable: true, items: [...] }),
 *   });
 */
export function buildDropdownMenu(editor, options) {
  const menu = new DropdownMenu(options, editor);
  const el = menu.render();
  el.__menu = menu; // expose for later setItems() if needed
  return el;
}
