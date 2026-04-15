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

    // Create main container
    this.mainContainer = document.createElement('div');
    this.mainContainer.className = 'penman-main';
    this.mainContainer.style.height = `${this.options.height}px`;
    this.mainContainer.style.minHeight = '200px';

    // Create editable area
    this.editableArea = document.createElement('div');
    this.editableArea.className = 'penman-editor-area';
    this.editableArea.contentEditable = true;

    // Defaulting to empty <p><br></p> if empty, ensures typing creates P instead of DIV
    const initialVal = this.textarea.value.trim();
    this.editableArea.innerHTML = initialVal ? initialVal : '<p><br></p>';

    // Create footer (status bar)
    this.footer = document.createElement('div');
    this.footer.className = 'penman-footer';
    this.footerHtmlPath = document.createElement('div');
    this.footerHtmlPath.className = 'penman-footer-path';
    this.footerStats = document.createElement('div');
    this.footerStats.className = 'penman-footer-stats';

    this.footer.appendChild(this.footerHtmlPath);
    this.footer.appendChild(this.footerStats);

    // Append elements
    this.mainContainer.appendChild(this.editableArea);
    this.mainContainer.appendChild(this.footer);

    this.container.appendChild(this.mainContainer);

    this.textarea.parentNode.insertBefore(this.container, this.textarea);
  }

  _updateFooter() {
    if (!this.footer) return;

    // Update stats
    const text = this.editableArea.innerText || '';
    const chars = text.replace(/\n/g, '').length;
    // Match words (simple word count)
    let words = 0; if (text.trim()) { words = text.trim().split(/\s+/).filter(w => w.length > 0).length; }
    this.footerStats.innerText = `Words: ${words} | Characters: ${chars}`;

    // Update HTML Path (simplified implementation)
    if (this.selection) {
      const sel = this.selection.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let node = range.commonAncestorContainer;

        // If selection is collapsed, use anchor node instead of commonAncestor to be more precise
        if (sel.isCollapsed && sel.anchorNode) {
            node = sel.anchorNode;
        }

        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const path = [];
        while (node && node !== this.editableArea && this.editableArea.contains(node)) {
          const tagName = node.nodeName.toLowerCase();
          // Filter out internal selection markers
          if (tagName === 'span' && node.id && node.id.startsWith('penman-selection-marker')) {
            node = node.parentNode;
            continue;
          }
          path.unshift(tagName);
          node = node.parentNode;
        }
        if (path.length === 0) path.push('p'); // Default fallback
        this.footerHtmlPath.innerText = path.join(' > ');
      }
    }
  }

  _bindEvents() {
    // Monitor selection changes (cursor movement, clicking)
    this.editableArea.addEventListener('mouseup', () => {
      this.emit('selectionChange');
    });

    this.on('selectionChange', () => this._updateFooter());
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

    this.on('change', () => this._updateFooter());
    // EVENT INTERCEPTION: Prevent native history pollution
    // Ensure document default block is p instead of div when empty
    this.editableArea.addEventListener('focus', () => {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    });

    // 1. Intercept keyboard shortcuts (Ctrl+Z, Cmd+Z, Ctrl+Y, Cmd+Shift+Z) and Enter
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

      // 1.a Table Breakout Logic
      if ((e.key === 'Enter' || e.key === 'ArrowUp') && !e.shiftKey) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        let node = sel.anchorNode;

        // Find if we are inside a table cell
        let td = null;
        let curr = node;
        while (curr && curr !== this.editableArea) {
            if (curr.tagName && (curr.tagName.toLowerCase() === 'td' || curr.tagName.toLowerCase() === 'th')) {
                td = curr;
                break;
            }
            curr = curr.parentNode;
        }

        if (td) {
            const table = td.closest('table');
            if (table) {
                // Check if table is the very first element in the editor
                if (this.editableArea.firstElementChild === table) {
                    // Check if we are in the first row of the table
                    const tbody = table.querySelector('tbody') || table;
                    const firstRow = tbody.querySelector('tr');

                    if (firstRow && firstRow.contains(td)) {
                        // Check if cursor is at the very beginning of the cell content
                        // Meaning there is no text before the cursor in this cell
                        const preRange = document.createRange();
                        preRange.selectNodeContents(td);
                        preRange.setEnd(range.startContainer, range.startOffset);
                        const textBeforeCursor = preRange.cloneContents().textContent;

                        if (textBeforeCursor.length === 0) {
                            e.preventDefault();

                            // Create a new paragraph and insert it BEFORE the table
                            const p = document.createElement('p');
                            p.innerHTML = '<br>';
                            this.editableArea.insertBefore(p, table);

                            // Move cursor to the new paragraph
                            sel.removeAllRanges();
                            const newRange = document.createRange();
                            newRange.setStart(p, 0);
                            newRange.collapse(true);
                            sel.addRange(newRange);

                            if (this.history) {
                              this.history.pushImmediate();
                            }
                            this.emit('change', this.getContent());
                            this._syncToTextarea();
                            return; // Stop further Enter key processing
                        }
                    }
                }
            }
        }
      }

      // Enter key fix for blocks
      if (e.key === 'Enter' && !e.shiftKey) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

        // Find closest block element
        let blockNode = null;
        let curr = node;
        while (curr && curr !== this.editableArea) {
          const tagName = curr.tagName ? curr.tagName.toLowerCase() : '';
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tagName)) {
            blockNode = curr;
            break;
          }
          curr = curr.parentNode;
        }

        if (blockNode) {
          // If block is empty, convert to p
          const text = blockNode.textContent.trim();
          if (!text) {
            e.preventDefault();
            this.execCommand('formatBlock', 'p');
            return;
          }

          // If at the end of the block, break out to a new p
          const range = sel.getRangeAt(0);
          const atEnd = range.endOffset === sel.anchorNode.textContent.length &&
                        (sel.anchorNode === blockNode || blockNode.contains(sel.anchorNode));

          // A more robust check for "end of block"
          const endRange = document.createRange();
          endRange.selectNodeContents(blockNode);
          endRange.setStart(range.endContainer, range.endOffset);
          const remainingText = endRange.cloneContents().textContent;

          if (remainingText.length === 0) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            if (blockNode.nextSibling) {
              blockNode.parentNode.insertBefore(p, blockNode.nextSibling);
            } else {
              blockNode.parentNode.appendChild(p);
            }

            // Move cursor to new p
            sel.removeAllRanges();
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.addRange(newRange);

            if (this.history) {
              this.history.pushImmediate();
            }
            this.emit('change', this.getContent());
            this._syncToTextarea();
          }
        }
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

    // 3. Intercept copy to normalize HTML/plain text payloads for same-editor copy/paste
    this.editableArea.addEventListener('copy', (e) => this._handleCopy(e));

    // 4. Intercept paste to prevent un-sanitized and history-polluting native pastes
    this.editableArea.addEventListener('paste', (e) => {
      if (e.defaultPrevented) return;
      e.preventDefault();

      const clipboardData = (e.originalEvent || e).clipboardData;
      let html = clipboardData.getData('text/html');
      let text = clipboardData.getData('text/plain');

      let contentToInsert = '';

      if (html) {
        // Sanitize rich text and preserve valid structural markup
        contentToInsert = this.sanitizer.sanitize(html);
      } else if (text) {
        // Escape plain text and preserve line breaks
        contentToInsert = this._escapeText(text).replace(/\n/g, '<br>');
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

  _handleCopy(event) {
    const clipboardData = (event.clipboardData || window.clipboardData);
    if (!clipboardData) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0).cloneRange();
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    const html = container.innerHTML;
    const text = container.textContent || '';

    event.preventDefault();
    clipboardData.setData('text/html', this.sanitizer.sanitize(html));
    clipboardData.setData('text/plain', text);
  }

  _escapeText(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
