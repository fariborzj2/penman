import { EventEmitter } from './EventEmitter.js';
import { SelectionManager } from '../selection/SelectionManager.js';
import { CommandManager } from '../commands/CommandManager.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { UIManager } from '../ui/UIManager.js';
import { PluginManager } from '../plugins/PluginManager.js';
import { Sanitizer } from '../sanitization/Sanitizer.js';

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

    // Core Subsystems
    this.selection = null;
    this.commands = null;
    this.history = null;
    this.ui = null;
    this.sanitizer = null;

    this.init();
  }

  init() {
    this._createUI();

    // Initialize core subsystems
    this.selection = new SelectionManager(this);
    this.commands = new CommandManager(this);
    this.history = new HistoryManager(this);
    this.ui = new UIManager(this);
    this.sanitizer = new Sanitizer();

    // Register built-in commands
    this.commands.register('undo', {
      execute: (editor) => editor.history.undo(),
      queryState: () => false
    });

    this.commands.register('redo', {
      execute: (editor) => editor.history.redo(),
      queryState: () => false
    });

    // Initialize plugins first so they can register their buttons to the UI registry
    PluginManager.init(this);

    // Render the UI based on options (after plugins are initialized)
    this.ui.render();

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

    // Create editable area
    this.editableArea = document.createElement('div');
    this.editableArea.className = 'penman-editor-area';
    this.editableArea.contentEditable = true;

    // Defaulting to empty <p><br></p> if empty, ensures typing creates P instead of DIV
    const initialVal = this.textarea.value.trim();
    this.editableArea.innerHTML = initialVal ? initialVal : '<p><br></p>';
    this.editableArea.style.minHeight = `${this.options.height}px`;

    // Append elements
    this.container.appendChild(this.editableArea);
    this.textarea.parentNode.insertBefore(this.container, this.textarea);
  }

  _bindEvents() {
    // Monitor selection changes (cursor movement, clicking)
    this.editableArea.addEventListener('mouseup', () => {
      this.emit('selectionChange');
    });

    this.editableArea.addEventListener('keyup', (e) => {
      // Ignore modifier keys to reduce noise
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      this.emit('selectionChange');
    });

    // Sync to textarea on input
    this.editableArea.addEventListener('input', () => {
      this._syncToTextarea();
      this.emit('change', this.editableArea.innerHTML);
    });

    // EVENT INTERCEPTION: Prevent native history pollution
    // Ensure document default block is p instead of div when empty
    this.editableArea.addEventListener('focus', () => {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    });

    // 1. Intercept keyboard shortcuts (Ctrl+Z, Cmd+Z, Ctrl+Y, Cmd+Shift+Z)
    this.editableArea.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedo = (isMac ? e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z' : (e.ctrlKey && e.key.toLowerCase() === 'y'));

      if (isUndo) {
        e.preventDefault();
        this.history.undo();
      }

      if (isRedo) {
        e.preventDefault();
        this.history.redo();
      }
    });

    // 2. Intercept beforeinput to block history-altering types
    this.editableArea.addEventListener('beforeinput', (e) => {
      if (e.inputType === 'historyUndo') {
        e.preventDefault();
        this.history.undo();
      } else if (e.inputType === 'historyRedo') {
        e.preventDefault();
        this.history.redo();
      }
    });

    // 3. Intercept paste to prevent un-sanitized and history-polluting native pastes
    this.editableArea.addEventListener('paste', (e) => {
      e.preventDefault();

      const clipboardData = (e.originalEvent || e).clipboardData;
      let html = clipboardData.getData('text/html');
      let text = clipboardData.getData('text/plain');

      let contentToInsert = '';

      if (html) {
        // Sanitize rich text
        contentToInsert = this.sanitizer.sanitize(html);
      } else if (text) {
        // Escape plain text
        contentToInsert = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      }

      if (contentToInsert) {
        // We use our insertContent method which already uses execCommand insertHTML and handles history
        this.insertContent(contentToInsert);
      }
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
    this.emit('selectionChange');
  }

  /**
   * Inserts HTML content at the current cursor position
   * @param {string} html - The HTML content to insert
   */
  insertContent(html) {
    this.focus();
    // Using execCommand 'insertHTML' is the standard way to insert content at cursor
    // while maintaining undo history and selection in a contentEditable element.
    document.execCommand('insertHTML', false, html);

    if (this.history) {
      this.history.pushImmediate();
    }

    this._syncToTextarea();
    this.emit('change', this.getContent());
    this.emit('selectionChange');
  }

  /**
   * Central command execution interface exposed to plugins and UI
   * @param {string} cmd - Command name
   * @param {any} [value=null] - Command value
   */
  execCommand(cmd, value = null) {
    if (this.commands) {
      this.commands.execute(cmd, value);
      this.emit('selectionChange');
    }
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
    if (this.ui) {
      this.ui.destroy();
    }

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

    // Clear events
    this.events = {};
  }
}
