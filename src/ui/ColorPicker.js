export class ColorPicker {
  /**
   * @param {Object} options
   * @param {string} [options.defaultColor='#000000']
   * @param {Function} [options.onChange]
   */
  constructor(options = {}) {
    this.options = {
      defaultColor: '#000000',
      ...options
    };

    this.currentColor = this.options.defaultColor;
    this.element = null;
    this.onChange = this.options.onChange || null;

    // A small standard palette
    this.palette = [
      'transparent', '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
      '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
      '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
      '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
      '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
      '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
      '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
      '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
    ];

    this._createDOM();
    this._injectStyles();
  }

  _createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'penman-color-picker';

    const header = document.createElement('div');
    header.className = 'penman-color-picker-header';

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'penman-color-picker-hex';
    hexInput.value = this.currentColor;
    hexInput.placeholder = '#HEX';

    header.appendChild(hexInput);

    const paletteGrid = document.createElement('div');
    paletteGrid.className = 'penman-color-picker-palette';

    this.palette.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'penman-color-picker-swatch';
      btn.style.backgroundColor = color;
      btn.title = color;
      btn.setAttribute('data-color', color);
      paletteGrid.appendChild(btn);

      btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.setColor(color, true, true);
      });
    });

    this.element.appendChild(header);
    this.element.appendChild(paletteGrid);

    // Bind hex input
    hexInput.addEventListener('input', (e) => {
        let val = e.target.value.trim().toLowerCase();

        if (val === 'transparent') {
            this.setColor(val, true, false);
            return;
        }

        if (!val.startsWith('#')) val = '#' + val;

        // Simple hex validation
        if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
            this.setColor(val, true, false);
        }
    });

    hexInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.setColor(this.currentColor, true, true);
        }
    });

    // Prevent default mousedown to keep focus in editor if needed
    this.element.addEventListener('mousedown', (e) => {
        // Allow input to be focused
        if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
        }
    });
  }

  _injectStyles() {
    if (document.getElementById('penman-color-picker-styles')) return;

    const style = document.createElement('style');
    style.id = 'penman-color-picker-styles';
    style.innerHTML = `
      /*
      * Penman Editor UI CSS
      * Contains styles for the editor container, toolbar, buttons, and dropdowns.
      */

      .penman-wrapper {
        border: 1px solid #e1e2e4;
        border-radius: 6px;
        background: #fff;
        font-family: Vazirmatn, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #222f3e;
      }

      .penman-main {
        display: flex;
        flex-direction: column;
        flex: 1;
        resize: vertical;
        overflow: hidden;
      }

      .penman-toolbar {
        padding: 8px 12px;
        border-bottom: 1px solid #e1e2e4;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        background: #fafafa;
      }

      .penman-btn {
        background: transparent;
        border: 1px solid transparent;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #333;
        font-size: 14px;
        font-family: inherit;
        min-width: 32px;
        min-height: 32px;
        box-sizing: border-box;
        transition: background-color 0.15s ease;
      }

      .penman-btn:hover {
        background: #e9eaec;
        border-color: transparent;
      }

      .penman-btn-active {
        background: #e3effd;
        color: #0052cc;
      }

      /* Floating UI Flipped State (arrow tail logic) */
      .penman-floating-flipped .penman-floating-tail-inner {
        bottom: auto !important;
        top: -6px !important;
        border-top: none !important;
        border-bottom: 6px solid white !important;
      }

      .penman-floating-flipped .penman-floating-tail-outer {
        bottom: auto !important;
        top: -7px !important;
        border-top: none !important;
        border-bottom: 7px solid #e0e0e0 !important;
      }

      .penman-separator {
        width: 1px;
        height: 20px;
        background-color: #d1d3d6;
        margin: 0 4px;
        display: inline-block;
      }

      /* Dropdown Component Styles */
      .penman-dropdown {
        position: relative;
        display: inline-block;
      }

      .penman-dropdown-trigger {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
      }

      .penman-dropdown-trigger:hover {
        background: #e9eaec;
      }

      /* Add a chevron to dropdown triggers */
      .penman-dropdown-trigger::after {
        content: '';
        display: inline-block;
        width: 5px;
        height: 5px;
        border-right: 1.5px solid currentColor;
        border-bottom: 1.5px solid currentColor;
        transform: rotate(45deg);
        margin-left: 6px;
        margin-bottom: 2px;
        opacity: 0.6;
      }

      .penman-dropdown-panel {
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 220px;
        background: #fff;
        border: 1px solid #e1e2e4;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        padding: 8px 0;
        margin-top: 4px;
      }
      .penman-dropdown-panel .penman-color-picker-container {
        padding: 0 8px;
      }
      .penman-dropdown-panel .penman-color-picker {
        padding: 0;
        box-shadow: unset;
        width: 100%
      }
      /* RTL adjustments */
      [dir="rtl"] .penman-dropdown-panel {
        left: auto;
        right: 0;
      }

      [dir="rtl"] .penman-dropdown-trigger::after {
        margin-left: 0;
        margin-right: 6px;
      }

      /* grid style */
      .penman-color-picker-palette {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 2px;
      }
      .penman-color-picker-swatch {
        aspect-ratio: 1/1;
        border: 1px solid #ccc;
      }
      /* BlockType Plugin Styles */
      .penman-blocktype-search {
        border: 1px solid #ccc;
        border-radius: 4px;
        outline: none;
        font-size: 14px;
        width: calc(100% - 16px);
        margin: 0 8px 8px 8px !important;
        font-family: inherit;
      }

      .penman-blocktype-search:focus {
        border-color: #0052cc;
      }

      .penman-blocktype-list {
        padding: 0 8px;
      }

      .penman-blocktype-item {
        border-radius: 4px;
        color: #222f3e;
        font-family: inherit;
        transition: background-color 0.15s ease;
        display: flex;
        align-items: center;
      }

      .penman-blocktype-item:hover {
        background-color: #f4f5f7;
      }

      .penman-blocktype-item-active {
        background-color: #e3effd;
        color: #0052cc;
        font-weight: 600;
      }

      /* Footer / Status Bar Styles */
      .penman-footer {
        padding: 4px 12px;
        height: 20px;
        border-top: 1px solid #e1e2e4;
        background: #fafafa;
        font-size: 12px;
        color: #666;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .penman-footer-path {
        font-family: monospace;
        color: #0052cc;
      }

      .penman-table-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 2px;
        padding: 0 10px 10px;
      }
      .penman-grid-cell {
        aspect-ratio: 1/1;
      }

    `;
    document.head.appendChild(style);
  }

  getColor() {
    return this.currentColor;
  }

  setColor(hex, triggerChange = false, final = true) {
    this.currentColor = hex;

    const hexInput = this.element.querySelector('.penman-color-picker-hex');
    if (hexInput && hexInput.value !== hex) {
        hexInput.value = hex;
    }

    if (triggerChange && typeof this.onChange === 'function') {
        this.onChange(this.currentColor, final);
    }
  }

  getElement() {
    return this.element;
  }
}
