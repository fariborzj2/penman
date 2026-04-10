export class UIManager {
  constructor(editor) {
    this.editor = editor;
    this.toolbarElement = null;
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
  }

  _createButton(cmd) {
    const btn = document.createElement('button');
    btn.className = `penman-btn penman-btn-${cmd}`;
    btn.type = 'button';
    btn.title = cmd;
    // Basic text label as fallback if no icon
    btn.textContent = cmd.charAt(0).toUpperCase() + cmd.slice(1);

    // Prevent default mousedown to avoid stealing focus from editor immediately
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    // Execute command on click
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.editor.execCommand(cmd);
    });

    return btn;
  }

  destroy() {
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.parentNode.removeChild(this.toolbarElement);
    }
  }
}
