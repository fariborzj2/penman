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
    this.container.className = 'penman-container';
    this.container.style.direction = this.options.direction;
    this.container.lang = this.options.lang;

    // Create editable area
    this.editableArea = document.createElement('div');
    this.editableArea.className = 'penman-editor';
    this.editableArea.contentEditable = true;
    this.editableArea.innerHTML = this.textarea.value;
    this.editableArea.style.minHeight = `${this.options.height}px`;

    // Append elements
    this.container.appendChild(this.editableArea);
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
}
