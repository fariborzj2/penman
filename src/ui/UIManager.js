import { IconProvider } from './IconProvider.js';
import { Modal } from './Modal.js';
import { Dropdown } from './Dropdown.js';
import { ToolbarRenderer } from './toolbar/ToolbarRenderer.js';

export class UIManager {
  constructor(editor) {
    this.editor = editor;
    this.toolbarElement = null;
    this.toolbarRenderer = null;
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
    const defaultOptions = {
      editor: this.editor,
      submitText: this.editor.i18n.t('ui.ok'),
      cancelText: this.editor.i18n.t('ui.cancel'),
      dir: this.editor.i18n.dir,
      ...options
    };
    const modal = new Modal(defaultOptions);
    modal.open();
    return modal;
  }

  /**
   * Renders the UI (Toolbar) for the editor
   */
  render() {
    const config = this.editor.options.toolbar || '';
    if (!config) return;

    this.toolbarRenderer = new ToolbarRenderer(this.editor, this);
    this.toolbarElement = this.toolbarRenderer.render(config);

    // Inject toolbar above main container
    this.editor.container.insertBefore(this.toolbarElement, this.editor.mainContainer);

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

      // Keep aria-pressed in sync for toggle-style buttons so assistive tech
      // can announce the active/inactive state. Native <button> elements
      // already have an implicit `button` role, so we only check for the
      // presence of `aria-pressed` (set in _createButton for toggle commands).
      if (btn.hasAttribute('aria-pressed')) {
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
  }

  /**
   * Returns true for commands that behave as toggles (bold, italic, etc.) and
   * therefore deserve an `aria-pressed` state. The list intentionally tracks
   * built-in toggle commands; plugin-supplied buttons can opt in via the
   * `ariaToggle: true` flag on their registry config.
   */
  _isToggleCommand(cmd) {
    return [
      'bold', 'italic', 'underline', 'strikethrough',
      'subscript', 'superscript',
      'justifyleft', 'justifycenter', 'justifyright', 'justifyfull',
      'insertorderedlist', 'insertunorderedlist',
      'ul', 'ol'
    ].includes(cmd);
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
        content: typeof dropdownConfig.render === 'function' ? dropdownConfig.render() : (dropdownConfig.content || ''),
        onOpen: dropdownConfig.onOpen,
        onClose: dropdownConfig.onClose
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

      // Accessibility: icon-only buttons need an explicit label for screen readers.
      btn.setAttribute('aria-label', registryConfig.ariaLabel || registryConfig.text || cmd);

      // Plugins can opt-in to toggle semantics with `ariaToggle: true`.
      if (registryConfig.ariaToggle) {
        btn.setAttribute('aria-pressed', 'false');
      }

      btn.addEventListener('mousedown', (e) => e.preventDefault());

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof registryConfig.onAction === 'function') {
          registryConfig.onAction();
        }
      });
    } else {
      // Normal built-in or fall-back command
      btn.title = this.editor.i18n.t(`core.${cmd}`) !== `core.${cmd}` ? this.editor.i18n.t(`core.${cmd}`) : cmd;
      btn.innerHTML = this.iconProvider.getIcon(cmd) || (btn.title.charAt(0).toUpperCase() + btn.title.slice(1));

      // Accessibility: announce the same label that `title` shows in the tooltip.
      btn.setAttribute('aria-label', btn.title);

      // Mark built-in toggle commands with aria-pressed so AT users perceive
      // the active state.
      if (this._isToggleCommand(cmd)) {
        btn.setAttribute('aria-pressed', 'false');
      }

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
    if (this.toolbarRenderer) {
      this.toolbarRenderer.destroy();
      this.toolbarRenderer = null;
    }
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.parentNode.removeChild(this.toolbarElement);
    }
  }
}
