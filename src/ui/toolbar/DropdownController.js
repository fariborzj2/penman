export class DropdownController {
  constructor(editor, rowElement) {
    this.editor = editor;
    this.rowElement = rowElement;
    this.element = null;
    this.buttonElement = null;
    this.panelElement = null;
    this.isOpen = false;
    this.items = []; // Items currently in the dropdown

    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'penman-toolbar-dropdown penman-dropdown';
    this.element.style.display = 'none'; // Hidden initially
    this.element.dataset.cmd = 'overflow';

    this.buttonElement = document.createElement('button');
    this.buttonElement.type = 'button';
    this.buttonElement.className = 'penman-btn penman-dropdown-trigger penman-overflow-btn';
    // The "..." icon
    this.buttonElement.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" focusable="false"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

    this.buttonElement.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggle();
    });
    this.buttonElement.addEventListener('mousedown', (e) => e.preventDefault());

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'penman-dropdown-panel penman-overflow-panel';
    this.panelElement.style.display = 'none';

    this.element.appendChild(this.buttonElement);
    this.element.appendChild(this.panelElement);

    this.rowElement.appendChild(this.element);
    return this.element;
  }

  showButton() {
    if (this.element) {
       this.element.style.display = 'inline-block';
    }
  }

  hideButton() {
    if (this.element) {
       this.element.style.display = 'none';
       this.close();
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen || this.items.length === 0) return;
    this.isOpen = true;
    this.panelElement.style.display = 'flex'; // Use flex for layout inside dropdown
    this.panelElement.style.flexWrap = 'wrap';
    this.buttonElement.classList.add('penman-btn-active');
    document.addEventListener('click', this._handleOutsideClick);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panelElement.style.display = 'none';
    this.buttonElement.classList.remove('penman-btn-active');
    document.removeEventListener('click', this._handleOutsideClick);
  }

  _handleOutsideClick(e) {
    if (!this.element.contains(e.target)) {
      this.close();
    }
  }

  addItem(element) {
    this.items.push(element);
    this.panelElement.appendChild(element);
  }

  clear() {
    this.items = [];
    while (this.panelElement.firstChild) {
      this.panelElement.removeChild(this.panelElement.firstChild);
    }
  }

  getButtonWidth() {
    // If not rendered or hidden, assume standard width (e.g., ~36px including margins)
    if (!this.element || this.element.style.display === 'none') {
        return 36;
    }
    return this.element.getBoundingClientRect().width;
  }

  destroy() {
    document.removeEventListener('click', this._handleOutsideClick);
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
