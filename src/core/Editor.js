import { EventEmitter } from './EventEmitter.js';
import { SelectionManager } from '../selection/SelectionManager.js';
import { CommandManager } from '../commands/CommandManager.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { UIManager } from '../ui/UIManager.js';
import { PluginManager } from '../plugins/PluginManager.js';
import { Sanitizer } from '../sanitization/Sanitizer.js';
import { I18nManager } from '../i18n/I18nManager.js';

export class Editor extends EventEmitter {
  constructor(options) {
    super();
    this.options = {
      lang: 'en',
      direction: 'auto',
      height: 300,
      ...options
    };

    if (this.options.element) {
      this.textarea = this.options.element;
    } else {
      this.textarea = document.querySelector(this.options.selector);
    }
    
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
    this.i18n = null;

    this.init();
  }

  init() {
    // Initialize i18n manager first
    this.i18n = new I18nManager(this.options.lang);

    this._createUI();

    // Initialize core subsystems
    this.selection = new SelectionManager(this);
    this.commands = new CommandManager(this);
    this.history = new HistoryManager(this);
    this.ui = new UIManager(this);
    this.sanitizer = new Sanitizer(this);

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

    const resolvedDir = this.options.direction === 'auto' ? this.i18n.dir : this.options.direction;
    this.container.setAttribute('dir', resolvedDir);
    this.container.lang = this.i18n.lang;

    if (resolvedDir === 'rtl') {
      this.container.classList.add('penman-rtl');
    }

    // Create main container
    this.mainContainer = document.createElement('div');
    this.mainContainer.className = 'penman-main';
    this.mainContainer.style.height = `${this.options.height}px`;
    this.mainContainer.style.minHeight = '200px';

    // Create editable area
    this.editableArea = document.createElement('div');
    this.editableArea.className = 'penman-editor-area';
    this.editableArea.contentEditable = true;

    // Defaulting to empty <p></p> if empty, ensures typing creates P instead of DIV
    const initialVal = this.textarea.value.trim();
    this.editableArea.innerHTML = initialVal ? initialVal : '<p></p>';

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

    this.on('selectionChange', () => {
      this._updateFooter();
    });

    // Prevent default navigation for all links in the editor
    this.editableArea.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        e.preventDefault();
      }
    });

    this.editableArea.addEventListener('mousedown', (e) => {
      const widget = e.target.closest('table, figure.penman-image, figure.penman-media-block, .penman-suggested-posts-wrapper');
      if (widget) {
        // If clicking inside an editable/interactive part, don't select the whole node
        const isInteractive = e.target.closest('figcaption, td, th');
        if (!isInteractive) {
          e.preventDefault();
          this.editableArea.focus(); // Ensure focus for keyboard events
          this.selection.selectNode(widget);
          return;
        }
      }

      // If clicking elsewhere, we might want to clear node selection,
      // but only if we are not clicking inside the current selected node.
      if (this.selection.getSelectedNode() && !this.selection.getSelectedNode().contains(e.target)) {
        this.selection.clearNodeSelection();
      }
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

      const selectedNode = this.selection.getSelectedNode();

      if (selectedNode) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          this._deleteSelectedContent();
          return;
        }

        if (e.key.startsWith('Arrow')) {
          this.selection.clearNodeSelection();
          // Allow native arrow navigation to take over from here
          return;
        }
      }

      if (isUndo) {
        e.preventDefault();
        this.history.undo();
      }

      if (isRedo) {
        e.preventDefault();
        this.history.redo();
      }

      // 1.a Block Breakout Logic (Tables, Figures)
      if ((e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.shiftKey) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        let node = sel.anchorNode;

        // Helper to check if cursor is at the very beginning of an element
        const isAtStart = (el, r) => {
            const preRange = document.createRange();
            preRange.selectNodeContents(el);
            preRange.setEnd(r.startContainer, r.startOffset);

            // To properly check if there is actual content before the cursor,
            // we look at the original DOM (not clones which lose object equality).
            // Walk from the start of the element up to the cursor.
            let hasContent = false;
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL, null, false);
            let n = walker.nextNode();
            while (n) {
                // If we reached the start container, we are done checking nodes before it
                if (n === r.startContainer) {
                    // Check if there is text before the cursor offset
                    if (n.nodeType === Node.TEXT_NODE && r.startOffset > 0 && n.textContent.substring(0, r.startOffset).trim().length > 0) {
                        hasContent = true;
                    }
                    break;
                }

                // If it's a text node before the start container with text
                if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0) {
                    hasContent = true;
                    break;
                }

                // If it's an image or other meaningful block element
                if (n.nodeType === Node.ELEMENT_NODE && (n.tagName.toLowerCase() === 'img' || n.tagName.toLowerCase() === 'table' || n.tagName.toLowerCase() === 'br')) {
                    // If we are about to enter a table/img but our startContainer is inside it, it's fine, we will hit it.
                    // But if it's purely before us:
                    if (!n.contains(r.startContainer)) {
                        if (!this._isProppingBR(n)) {
                            hasContent = true;
                            break;
                        }
                    }
                }

                // If it's a table cell that is before our cell
                if (n.nodeType === Node.ELEMENT_NODE && (n.tagName.toLowerCase() === 'td' || n.tagName.toLowerCase() === 'th')) {
                    if (!n.contains(r.startContainer)) {
                        hasContent = true;
                        break;
                    }
                }

                n = walker.nextNode();
            }
            return !hasContent;
        };

        // Helper to check if cursor is at the very end of an element
        const isAtEnd = (el, r) => {
            let hasContent = false;
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL, null, false);
            // Fast forward to the end container
            let n = walker.nextNode();
            while (n && n !== r.endContainer) {
                // Check if endContainer is inside n, if so, we must enter it
                n = walker.nextNode();
            }

            if (n === r.endContainer) {
                 if (n.nodeType === Node.TEXT_NODE && r.endOffset < n.textContent.length && n.textContent.substring(r.endOffset).trim().length > 0) {
                     hasContent = true;
                 }
                 n = walker.nextNode();
            }

            while (n && !hasContent) {
                if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0) {
                    hasContent = true;
                }
                if (n.nodeType === Node.ELEMENT_NODE && (n.tagName.toLowerCase() === 'img' || n.tagName.toLowerCase() === 'table' || n.tagName.toLowerCase() === 'br')) {
                    if (!this._isProppingBR(n)) {
                        hasContent = true;
                    }
                }
                if (n.nodeType === Node.ELEMENT_NODE && (n.tagName.toLowerCase() === 'td' || n.tagName.toLowerCase() === 'th')) {
                    hasContent = true;
                }
                n = walker.nextNode();
            }
            return !hasContent;
        };

        let blockContainer = null;
        let p = node;
        while (p && p !== this.editableArea) {
            const tag = p.tagName ? p.tagName.toLowerCase() : '';
            if (tag === 'table' || tag === 'figure') {
                blockContainer = p;
                break;
            }
            p = p.parentNode;
        }

        if (blockContainer) {
            // Try breakout before
            if ((e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') && isAtStart(blockContainer, range)) {
                // If it's already preceeded by a paragraph, no need to break out unless we want to move cursor?
                // Actually if pressing Enter at the very beginning of a table, we always want to add a paragraph before it.
                // Or maybe only if there isn't one already? If there is a P, arrow up just goes there.
                // But Enter should probably push it down and create space.
                if (e.key === 'Enter' || (!blockContainer.previousElementSibling || !['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(blockContainer.previousElementSibling.tagName.toLowerCase()))) {
                    e.preventDefault();
                    const newP = document.createElement('p');
                    newP.innerHTML = '<br>';
                    this.editableArea.insertBefore(newP, blockContainer);
                    sel.removeAllRanges();
                    const newRange = document.createRange();
                    newRange.setStart(newP, 0);
                    newRange.collapse(true);
                    sel.addRange(newRange);

                    if (this.history) {
                      this.history.pushImmediate();
                    }
                    this.emit('change', this.getContent());
                    this._syncToTextarea();
                    return;
                }
            }

            // Try breakout after
            if ((e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') && isAtEnd(blockContainer, range)) {
                if (e.key === 'Enter' || (!blockContainer.nextElementSibling || !['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(blockContainer.nextElementSibling.tagName.toLowerCase()))) {
                    e.preventDefault();
                    const newP = document.createElement('p');
                    newP.innerHTML = '<br>';
                    if (blockContainer.nextSibling) {
                        this.editableArea.insertBefore(newP, blockContainer.nextSibling);
                    } else {
                        this.editableArea.appendChild(newP);
                    }
                    sel.removeAllRanges();
                    const newRange = document.createRange();
                    newRange.setStart(newP, 0);
                    newRange.collapse(true);
                    sel.addRange(newRange);

                    if (this.history) {
                        this.history.pushImmediate();
                    }
                    this.emit('change', this.getContent());
                    this._syncToTextarea();
                    return;
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

    // 3. Intercept copy/cut to normalize HTML/plain text payloads for same-editor copy/paste
    this.editableArea.addEventListener('copy', (e) => this._handleCopy(e));
    this.editableArea.addEventListener('cut', (e) => this._handleCopy(e));

    // 4. Intercept paste to prevent un-sanitized and history-polluting native pastes
    this.editableArea.addEventListener('paste', (e) => this._handlePaste(e));
  }

  /**
   * Helper to check if a node is a "propping" BR (the only child of a paragraph)
   * @private
   */
  _isProppingBR(node) {
    return node &&
           node.nodeType === Node.ELEMENT_NODE &&
           node.tagName.toLowerCase() === 'br' &&
           node.parentNode &&
           node.parentNode.nodeType === Node.ELEMENT_NODE &&
           node.parentNode.tagName.toLowerCase() === 'p' &&
           node.parentNode.childNodes.length === 1;
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

    // Check if we are inserting a block-level widget into an empty paragraph
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

        const isBlockWidget = html.trim().startsWith('<table') ||
                            html.trim().startsWith('<figure') ||
                            html.trim().includes('penman-suggested-posts-wrapper');

        if (isBlockWidget && node.tagName === 'P' && node.parentNode === this.editableArea && node.textContent.trim() === '') {
            const temp = document.createElement('div');
            temp.innerHTML = html.trim();
            const fragment = document.createDocumentFragment();
            while(temp.firstChild) fragment.appendChild(temp.firstChild);

            const firstChild = fragment.firstChild;
            node.parentNode.replaceChild(fragment, node);

            // Set selection after inserted content
            const newRange = document.createRange();
            newRange.setStartAfter(firstChild);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            if (this.history) {
                this.history.pushImmediate();
            }
            this._syncToTextarea();
            this.emit('change', this.getContent());
            this.emit('selectionChange');
            return;
        }
    }

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

    let html = '';
    let text = '';

    const selectedNode = this.selection.getSelectedNode();
    if (selectedNode) {
        // Tag internal content to avoid over-sanitization on paste
        const clone = selectedNode.cloneNode(true);
        clone.setAttribute('data-penman-core', 'true');
        html = clone.outerHTML;
        text = selectedNode.textContent || '';
    } else {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0).cloneRange();
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        html = container.innerHTML;
        text = container.textContent || '';
    }

    event.preventDefault();
    // We do NOT sanitize on copy. Sanitization happens on paste.
    // This ensures internal structures like class names or wrapper divs are preserved
    // when copying and pasting within the same editor.
    clipboardData.setData('text/html', html);
    clipboardData.setData('text/plain', text);

    if (event.type === 'cut') {
        this._deleteSelectedContent();
    }
  }

  /**
   * Deletes the currently selected content (either a node or a range)
   * @private
   */
  _deleteSelectedContent() {
    const selectedNode = this.selection.getSelectedNode();

    if (selectedNode) {
        const parent = selectedNode.parentNode;
        const next = selectedNode.nextSibling || selectedNode.previousSibling;

        selectedNode.remove();
        this.selection.clearNodeSelection();

        if (next) {
            const range = document.createRange();
            range.setStart(next, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (parent) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            parent.appendChild(p);
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } else {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Ensure some content exists to prevent collapse
        if (this.editableArea.innerHTML.trim() === '') {
            this.editableArea.innerHTML = '<p><br></p>';
            const range = document.createRange();
            range.setStart(this.editableArea.firstChild, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    if (this.history) {
        this.history.pushImmediate();
    }
    this.emit('change', this.getContent());
    this._syncToTextarea();
  }

  _escapeText(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Internal paste handler with Smart Merge logic
   * @param {ClipboardEvent} e
   * @private
   */
  _handlePaste(e) {
    if (e.defaultPrevented) return;
    e.preventDefault();

    const clipboardData = (e.originalEvent || e).clipboardData;
    let html = clipboardData.getData('text/html');
    let text = clipboardData.getData('text/plain');

    let contentToInsert = '';

    if (html) {
      // 1. Sanitize rich text
      contentToInsert = this.sanitizer.sanitize(html);

      // 2. SMART MERGE: If pasting into a block, unwrap leading/trailing block tags
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        let container = sel.anchorNode;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;

        // Find closest mergeable block
        let blockNode = null;
        let curr = container;
        const mergeableTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'];
        while (curr && curr !== this.editableArea) {
          if (curr.tagName && mergeableTags.includes(curr.tagName.toUpperCase())) {
            blockNode = curr;
            break;
          }
          curr = curr.parentNode;
        }

        if (blockNode) {
          const doc = new DOMParser().parseFromString(contentToInsert, 'text/html');
          const fragment = doc.body;
          const children = Array.from(fragment.childNodes);

          if (children.length > 0) {
            // Helper to check if a node is a simple block element
            const isSimpleBlock = (node) => {
              return node && node.nodeType === Node.ELEMENT_NODE && mergeableTags.includes(node.tagName.toUpperCase());
            };

            // Process leading node
            const first = children[0];
            if (isSimpleBlock(first)) {
              while (first.firstChild) {
                fragment.insertBefore(first.firstChild, first);
              }
              fragment.removeChild(first);
            }

            // Process trailing node (might be the same as first if length 1)
            const updatedChildren = Array.from(fragment.childNodes);
            const last = updatedChildren[updatedChildren.length - 1];
            if (isSimpleBlock(last)) {
              while (last.firstChild) {
                fragment.insertBefore(last.firstChild, last);
              }
              fragment.removeChild(last);
            }

            contentToInsert = fragment.innerHTML;
          }
        }
      }
    } else if (text) {
      // Escape plain text and preserve line breaks
      const escaped = this._escapeText(text);
      if (escaped.includes('\n')) {
        contentToInsert = escaped.split('\n').map(line => `<p>${line}</p>`).join('');
      } else {
        contentToInsert = escaped;
      }
    }

    if (contentToInsert) {
      this.insertContent(contentToInsert);
    }
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
