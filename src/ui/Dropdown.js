export class Dropdown {
  constructor(options) {
    this.options = {
      title: options.title || 'Dropdown',
      icon: options.icon || '',
      content: options.content || '',
      onOpen: options.onOpen || null,
      onClose: options.onClose || null
    };

    this.isOpen = false;
    this.element = null;
    this.buttonElement = null;
    this.panelElement = null;

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.close = this.close.bind(this);
    this._handleOutsideClick = this._handleOutsideClick.bind(this);

    this._render();
  }

  _render() {
    this.element = document.createElement('div');
    this.element.className = 'penman-dropdown';

    this.buttonElement = document.createElement('button');
    this.buttonElement.className = 'penman-btn penman-dropdown-trigger';
    this.buttonElement.type = 'button';
    this.buttonElement.title = this.options.title;
    this.buttonElement.innerHTML = this.options.icon || this.options.title;

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'penman-dropdown-panel';
    this.panelElement.style.display = 'none';

    if (typeof this.options.content === 'string') {
      this.panelElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      this.panelElement.appendChild(this.options.content);
    }

    this.element.appendChild(this.buttonElement);
    this.element.appendChild(this.panelElement);

    this.buttonElement.addEventListener('click', this.toggle);
  }

  toggle(e) {
    if (e) e.preventDefault();

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.panelElement.style.display = 'block';
    this.buttonElement.classList.add('penman-btn-active');

    // Slight delay to avoid capturing the triggering click
    setTimeout(() => {
      document.addEventListener('click', this._handleOutsideClick);
    }, 0);

    if (this.options.onOpen) {
      this.options.onOpen(this);
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.panelElement.style.display = 'none';
    this.buttonElement.classList.remove('penman-btn-active');

    document.removeEventListener('click', this._handleOutsideClick);

    if (this.options.onClose) {
      this.options.onClose(this);
    }
  }

  _handleOutsideClick(e) {
    // If click is outside the entire dropdown component
    if (!this.element.contains(e.target)) {
      this.close();
    }
  }

  destroy() {
    this.close();
    this.buttonElement.removeEventListener('click', this.toggle);
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
