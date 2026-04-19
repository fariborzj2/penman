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
      '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d',
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
      .penman-color-picker {
        width: 174px;
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: inherit;
        padding: 8px;
        box-sizing: border-box;
      }
      .penman-color-picker-header {
        display: flex;
        margin-bottom: 8px;
      }
      .penman-color-picker-hex {
        border: 1px solid #ccc;
        border-radius: 4px;
        outline: none;
        font-size: 14px;
        width: 100%;
        padding: 5px;
        direction: ltr;
      }
      .penman-color-picker-palette {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 2px;
      }
      .penman-color-picker-swatch {
        width: 14px;
        height: 14px;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
        position: relative;
        overflow: hidden;
      }
      .penman-color-picker-swatch[data-color="transparent"] {
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 6px 6px;
        background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
      }
      .penman-color-picker-swatch[data-color="transparent"]::after {
         content: '';
         position: absolute;
         top: 50%;
         left: -2px;
         right: -2px;
         height: 2px;
         background: red;
         transform: translateY(-50%) rotate(45deg);
      }
      .penman-color-picker-swatch:hover {
        border: 2px solid #454545;
        transform: scale(1.1);
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
