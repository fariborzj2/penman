import { EventEmitter } from './EventEmitter.js';

export class Editor extends EventEmitter {
  constructor(options) {
    super();
    this.options = {
      lang: 'en',
      direction: 'auto',
      height: 300,
      ...options
    };

    this.textarea = document.querySelector(this.options.selector);
    if (!this.textarea) {
      throw new Error(`Penman Editor: Could not find element with selector "${this.options.selector}"`);
    }

    this.container = null;
    this.editableArea = null;

    this.init();
  }

  init() {
    this._createUI();
    this._bindEvents();
    this.emit('init', this);
  }

  _createUI() {
    // Hide original textarea
    this.textarea.style.display = 'none';

    // Create wrapper container
    this.container = document.createElement('div');
    this.container.className = 'penman-wrapper';
    this.container.setAttribute('dir', this.options.direction);
    this.container.lang = this.options.lang;

    // Create toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'penman-toolbar';

    // Create editable area
    this.editableArea = document.createElement('div');
    this.editableArea.className = 'penman-editor-area';
    this.editableArea.contentEditable = true;
    this.editableArea.innerHTML = this.textarea.value;
    this.editableArea.style.minHeight = `${this.options.height}px`;

    // Create statusbar
    this.statusbar = document.createElement('div');
    this.statusbar.className = 'penman-statusbar';

    // Append elements
    this.container.appendChild(this.toolbar);
    this.container.appendChild(this.editableArea);
    this.container.appendChild(this.statusbar);
    this.textarea.parentNode.insertBefore(this.container, this.textarea.nextSibling);
  }

  _bindEvents() {
    this.editableArea.addEventListener('input', () => {
      this._syncToTextarea();
      this.emit('change', this.editableArea.innerHTML);
    });
  }

  _syncToTextarea() {
    this.textarea.value = this.editableArea.innerHTML;
  }

  /**
   * Returns the current HTML content of the editor
   * @returns {string} The HTML content
   */
  getContent() {
    return this.editableArea.innerHTML;
  }

  /**
   * Sets the HTML content of the editor and syncs with the textarea
   * @param {string} html - The HTML content to set
   */
  setContent(html) {
    this.editableArea.innerHTML = html;
    this._syncToTextarea();
  }

  /**
   * Focuses the editor's editable area
   */
  focus() {
    if (this.editableArea) {
      this.editableArea.focus();
    }
  }

  /**
   * Destroys the editor instance, removing UI and restoring the original textarea
   */
  destroy() {
    // Show original textarea
    if (this.textarea) {
      this.textarea.style.display = '';
    }

    // Remove the editor container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Remove from index registry if possible (handled in index.js usually, but we emit)
    this.emit('destroy', this);

    // Clear references
    this.container = null;
    this.editableArea = null;
    this.toolbar = null;
    this.statusbar = null;

    // Clear events
    this.events = {};
  }
}
