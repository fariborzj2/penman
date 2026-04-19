export class CommandManager {
  constructor(editor) {
    this.editor = editor;
    this.commands = {};
  }

  /**
   * Registers a custom command to the editor
   */
  register(name, commandSpec) {
    this.commands[name] = commandSpec;
  }

  /**
   * Defines which commands are allowed to use the browser's execCommand fallback.
   */
  get fallbackWhitelist() {
    return ['justifyleft', 'justifycenter', 'justifyright', 'justifyfull', 'formatBlock', 'bold', 'italic', 'underline', 'strikethrough', 'insertUnorderedList', 'insertOrderedList'];
  }

  /**
   * Queries if the given command is active on the current selection.
   * @param {string} cmd - Command name
   * @returns {boolean}
   */
  queryState(cmd) {
    if (this.commands[cmd] && typeof this.commands[cmd].queryState === 'function') {
      return this.commands[cmd].queryState(this.editor);
    } else if (this.fallbackWhitelist.includes(cmd)) {
      try {
        // Special handling for text alignment in RTL context
        // Some browsers might report justifyleft incorrectly depending on the direction
        if (cmd.startsWith('justify')) {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return document.queryCommandState(cmd);
          let node = sel.anchorNode;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

          if (node && node.nodeType === Node.ELEMENT_NODE) {
            const computedStyle = window.getComputedStyle(node);
            const textAlign = computedStyle.textAlign;
            const direction = computedStyle.direction;

            if (cmd === 'justifyleft') {
              return textAlign === 'left' || (textAlign === 'start' && direction === 'ltr');
            } else if (cmd === 'justifyright') {
              return textAlign === 'right' || (textAlign === 'start' && direction === 'rtl');
            } else if (cmd === 'justifycenter') {
              return textAlign === 'center';
            } else if (cmd === 'justifyfull') {
              return textAlign === 'justify';
            }
          }
        }

        return document.queryCommandState(cmd);
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Executes a command on the editor
   */
  execute(cmd, value = null) {
    // 1. Restore selection so command hits the right spot
    this.editor.selection.restore();

    // 2. Execute
    if (this.commands[cmd] && typeof this.commands[cmd].execute === 'function') {
      this.commands[cmd].execute(this.editor, value);
    } else if (this.fallbackWhitelist.includes(cmd)) {
      document.execCommand(cmd, false, value);
    } else {
      console.warn(`Penman Editor: Command "${cmd}" aborted (not registered/whitelisted).`);
      return;
    }

    // 3. Save selection *before* normalization via markers
    // Because normalization rewrites tags, we must insert markers now so they are part of the DOM tree
    this.editor.selection.save();

    // 4. Normalize DOM (Marker-aware)
    this._normalizeDOM();

    // 5. Restore selection after normalization
    this.editor.selection.restore();

    // 6. Push explicit snapshot to HistoryManager to bypass browser's undo stack
    if (this.editor.history) {
      this.editor.history.pushImmediate();
    }

    // 7. Update single source of truth
    this.editor.emit('change', this.editor.getContent());
    this.editor._syncToTextarea();
  }

  /**
   * Normalizes the DOM while preserving selection markers.
   * Instead of using innerHTML which destroys object references, it manipulates child nodes.
   */
  _normalizeDOM() {
    const area = this.editor.editableArea;
    if (!area) return;

    // Helper to replace a tag while keeping its children intact (Marker-aware)
    const replaceTag = (oldTag, newTagName) => {
      const newTag = document.createElement(newTagName);
      // Move all children directly
      while (oldTag.firstChild) {
        newTag.appendChild(oldTag.firstChild);
      }
      oldTag.parentNode.replaceChild(newTag, oldTag);
    };

    const bTags = Array.from(area.querySelectorAll('b'));
    bTags.forEach(node => replaceTag(node, 'strong'));

    const iTags = Array.from(area.querySelectorAll('i'));
    iTags.forEach(node => replaceTag(node, 'em'));

    // Clean empty tags, ensuring we don't accidentally remove markers if they are the only children
    // Markers are spans, so they won't be caught by this specific selector unless inside an empty tag.
    // If a strong tag only contains a marker, it is technically NOT empty.
    const potentialEmptyTags = Array.from(area.querySelectorAll('strong, em, u'));
    potentialEmptyTags.forEach(node => {
      // Remove only if completely empty (no text, no markers)
      if (node.innerHTML === '') {
         node.parentNode.removeChild(node);
      }
    });

    // Invoke Sanitizer's span merge explicitly if available to flatten any stray spans
    // This catches stray spans spawned by native execCommand across the entire document
    if (this.editor.sanitizer && typeof this.editor.sanitizer._mergeNestedSpans === 'function') {
      this.editor.sanitizer._mergeNestedSpans(area);
    }
  }
}
