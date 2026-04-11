import { IconProvider } from './IconProvider.js';
import { Modal } from './Modal.js';

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
      }
    };
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
        separator.innerHTML = '&nbsp;|&nbsp;';
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
