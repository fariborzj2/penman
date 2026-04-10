import { IconProvider } from './IconProvider.js';

export class UIManager {
  constructor(editor) {
    this.editor = editor;
    this.toolbarElement = null;
    this.buttons = [];
    this.iconProvider = new IconProvider();
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
    btn.title = cmd;
    btn.dataset.cmd = cmd;

    // Use icon provider for rendering content
    btn.innerHTML = this.iconProvider.getIcon(cmd) || (cmd.charAt(0).toUpperCase() + cmd.slice(1));

    // Prevent default mousedown to avoid stealing focus from editor immediately
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    // Execute command on click
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.editor.execCommand(cmd);
    });

    this.buttons.push(btn);

    return btn;
  }

  destroy() {
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.parentNode.removeChild(this.toolbarElement);
    }
  }
}
