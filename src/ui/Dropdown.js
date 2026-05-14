/**
 * Dropdown — a button that opens a panel of arbitrary content.
 *
 * Accessibility:
 *   - Trigger button has aria-haspopup="menu" and aria-expanded reflecting
 *     open/closed state.
 *   - Panel has role="menu" by default.
 *   - Keyboard: Enter/Space opens; Escape closes; Arrow Down focuses the
 *     first menuitem inside the panel; Tab navigates within naturally.
 *
 * Plugins that want a typed item list should layer DropdownMenu on top; this
 * class is the lowest-level primitive (button + panel container).
 */
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

    this.toggle = this.toggle.bind(this);
    this.close = this.close.bind(this);
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);

    this._render();
  }

  _render() {
    this.element = document.createElement('div');
    this.element.className = 'penman-dropdown';

    this.buttonElement = document.createElement('button');
    this.buttonElement.className = 'penman-btn penman-dropdown-trigger';
    this.buttonElement.type = 'button';
    // No `title` attribute — UIManager attaches a themed tooltip via
    // data-tooltip. We still expose the label to assistive tech via aria-label.
    this.buttonElement.setAttribute('aria-label', this.options.title);
    this.buttonElement.setAttribute('aria-haspopup', 'menu');
    this.buttonElement.setAttribute('aria-expanded', 'false');
    this.buttonElement.innerHTML = this.options.icon || this.options.title;

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'penman-dropdown-panel';
    this.panelElement.setAttribute('role', 'menu');
    this.panelElement.style.display = 'none';

    if (typeof this.options.content === 'string') {
      this.panelElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      this.panelElement.appendChild(this.options.content);
    }

    this.element.appendChild(this.buttonElement);
    this.element.appendChild(this.panelElement);

    this.element.__dropdownInstance = this;

    this.buttonElement.addEventListener('click', this.toggle);
    this.buttonElement.addEventListener('keydown', (e) => {
      // ArrowDown jumps focus into the panel without changing open state.
      if (e.key === 'ArrowDown' && this.isOpen) {
        e.preventDefault();
        this._focusFirstItem();
      } else if (e.key === 'ArrowDown' && !this.isOpen) {
        // Open AND focus first item.
        e.preventDefault();
        this.open();
        setTimeout(() => this._focusFirstItem(), 0);
      }
    });
  }

  toggle(e) {
    if (e) e.preventDefault();
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.panelElement.style.display = 'block';
    this.buttonElement.classList.add('penman-btn-active');
    this.buttonElement.setAttribute('aria-expanded', 'true');

    this._adjustPosition();

    // Slight delay to avoid capturing the triggering click.
    setTimeout(() => {
      document.addEventListener('click', this._handleOutsideClick);
      document.addEventListener('keydown', this._handleKeydown);
    }, 0);

    if (this.options.onOpen) this.options.onOpen(this);
  }

  _adjustPosition() {
    this.panelElement.style.left = '';
    this.panelElement.style.right = '';

    const panelRect = this.panelElement.getBoundingClientRect();
    const wrapper = this.element.closest('.penman-wrapper');
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();

    if (panelRect.right > wrapperRect.right) {
      this.panelElement.style.left = 'auto';
      this.panelElement.style.right = '0';
    }

    const updatedRect = this.panelElement.getBoundingClientRect();
    if (updatedRect.left < wrapperRect.left) {
      this.panelElement.style.left = '0';
      this.panelElement.style.right = 'auto';
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.panelElement.style.display = 'none';
    this.buttonElement.classList.remove('penman-btn-active');
    this.buttonElement.setAttribute('aria-expanded', 'false');

    document.removeEventListener('click', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);

    if (this.options.onClose) this.options.onClose(this);
  }

  _handleOutsideClick(e) {
    if (!this.element.contains(e.target)) this.close();
  }

  _handleKeydown(e) {
    if (!this.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      // Return focus to the trigger so the user can resume keyboard nav.
      try { this.buttonElement.focus(); } catch (_) { /* noop */ }
    }
  }

  /** Move keyboard focus to the first focusable element inside the panel. */
  _focusFirstItem() {
    const focusable = this.panelElement.querySelector(
      'button:not([disabled]), [role="menuitem"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      try { focusable.focus(); } catch (_) { /* noop */ }
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
