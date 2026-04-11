import { IconProvider } from './IconProvider.js';
import { Modal } from './Modal.js';
import { Dropdown } from './Dropdown.js';

export class UIManager {
  constructor(editor) {
    this.editor = editor;
    this.toolbarElement = null;
    this.buttons = [];
    this.iconProvider = new IconProvider();

    // The UI Registry, allowing plugins to add items to the UI
    this.registry = {
      buttons: {},
      addButton: (name, config) => {
        this.registry.buttons[name] = config;
      },
      dropdowns: {},
      addDropdown: (name, config) => {
        this.registry.dropdowns[name] = config;
      }
    };
  }

  /**
   * Creates a dropdown instance
   * @param {Object} options - Dropdown options (title, icon, content)
   * @returns {Dropdown} The instantiated Dropdown object
   */
  createDropdown(options) {
    return new Dropdown(options);
  }

  /**
   * Creates and opens a modal dialog
   * @param {Object} options - Modal options (title, body, onSubmit, etc.)
   * @returns {Modal} The instantiated Modal object
   */
  createModal(options) {
    const modal = new Modal(options);
    modal.open();
    return modal;
  }

  /**
   * Renders the UI (Toolbar) for the editor
   */
  render() {
    const config = this.editor.options.toolbar || '';
    if (!config) return;

    this.toolbarElement = document.createElement('div');
    this.toolbarElement.className = 'penman-toolbar';

    const groups = config.split('|');
    groups.forEach((group, index) => {
      const commands = group.trim().split(/\s+/);
      commands.forEach(cmd => {
        if (cmd) {
          const btn = this._createButton(cmd);
          this.toolbarElement.appendChild(btn);
        }
      });

      // Add separator if not the last group
      if (index < groups.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'penman-separator';
        this.toolbarElement.appendChild(separator);
      }
    });

    // Inject toolbar above editable area
    this.editor.container.insertBefore(this.toolbarElement, this.editor.editableArea);

    // Bind event to update active states
    this.editor.on('selectionChange', () => this._updateButtonStates());
  }

  _updateButtonStates() {
    this.buttons.forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (!cmd) return;

      const isActive = this.editor.commands.queryState(cmd);
      if (isActive) {
        btn.classList.add('penman-btn-active');
      } else {
        btn.classList.remove('penman-btn-active');
      }
    });
  }

  _createButton(cmd) {
    // Check if item is registered as a dropdown
    const dropdownConfig = this.registry.dropdowns[cmd];
    if (dropdownConfig) {
      // For dropdowns, we usually want to show the text (e.g. "Paragraph") and maybe an icon.
      // If no icon is explicitly provided and the provider returns a fallback span, let's just use the text.
      let iconHTML = dropdownConfig.icon || '';

      if (!iconHTML && dropdownConfig.text) {
          iconHTML = dropdownConfig.text;
      } else if (!iconHTML) {
          const defaultIcon = this.iconProvider.getIcon(cmd);
          if (!defaultIcon.includes('penman-icon-fallback')) {
             iconHTML = defaultIcon;
          } else {
             iconHTML = cmd;
          }
      }

      const dropdown = this.createDropdown({
        title: dropdownConfig.text || cmd,
        icon: iconHTML,
        content: typeof dropdownConfig.render === 'function' ? dropdownConfig.render() : (dropdownConfig.content || '')
      });
      // Add standard button classes for styling
      dropdown.buttonElement.classList.add(`penman-btn-${cmd}`);
      // Expose a way to access the dropdown instance if needed
      dropdown.element.dataset.cmd = cmd;
      this.buttons.push(dropdown.buttonElement); // For active state syncing if needed
      return dropdown.element;
    }

    const btn = document.createElement('button');
    btn.className = `penman-btn penman-btn-${cmd}`;
    btn.type = 'button';
    btn.dataset.cmd = cmd;

    // Check if button is registered via a plugin
    const registryConfig = this.registry.buttons[cmd];

    if (registryConfig) {
      btn.title = registryConfig.text || cmd;
      // You could use icon from config if provided, but fallback to our iconProvider if not
      btn.innerHTML = registryConfig.icon ? registryConfig.icon : (this.iconProvider.getIcon(cmd) || registryConfig.text || cmd);

      btn.addEventListener('mousedown', (e) => e.preventDefault());

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof registryConfig.onAction === 'function') {
          registryConfig.onAction();
        }
      });
    } else {
      // Normal built-in or fall-back command
      btn.title = cmd;
      btn.innerHTML = this.iconProvider.getIcon(cmd) || (cmd.charAt(0).toUpperCase() + cmd.slice(1));

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.editor.execCommand(cmd);
      });
    }

    this.buttons.push(btn);

    return btn;
  }

  destroy() {
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.parentNode.removeChild(this.toolbarElement);
    }
  }
}
