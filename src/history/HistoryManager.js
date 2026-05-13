export class HistoryManager {
  constructor(editor) {
    this.editor = editor;
    this.undoStack = [];
    this.redoStack = [];

    this.maxStackSize = 100;
    this.debounceTimeout = null;
    this.debounceDelay = 500;

    // Save initial state
    this.pushImmediate();

    this._bindTypingEvents();
  }

  _bindTypingEvents() {
    this.editor.editableArea.addEventListener('input', (e) => {
      // Ignore input events triggered by execCommand or internal formatting
      // We only debounce normal typing
      if (e.inputType && e.inputType.startsWith('insertText')) {
        this.pushDebounced();
      }
    });
  }

  /**
   * Captures the current state (HTML + Selection)
   * @returns {Object} Snapshot
   */
  _captureSnapshot() {
    // Save selection markers first so they are in the HTML
    this.editor.selection.save();
    const html = this.editor.getContent();

    // We clean up the markers immediately from the live DOM after capturing
    // so the user doesn't see them or get weird artifacts if they type
    this.editor.selection.restore();

    return { html };
  }

  /**
   * Pushes a snapshot to the undo stack immediately
   * Used for structural changes (commands, paste, enter)
   */
  pushImmediate() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    const snapshot = this._captureSnapshot();

    // Avoid pushing duplicate consecutive states
    if (this.undoStack.length > 0) {
      const lastSnapshot = this.undoStack[this.undoStack.length - 1];
      // Clean marker specific spans for comparison, as selection might change but HTML is same
      const stripMarkers = (html) => html.replace(/<span id="penman-selection-marker-(start|end)" style="display: none;"><\/span>/g, '');
      if (stripMarkers(lastSnapshot.html) === stripMarkers(snapshot.html)) {
        return;
      }
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // remove oldest
    }

    // Clear redo stack on new action
    this.redoStack = [];
  }

  /**
   * Pushes a snapshot to the undo stack with debouncing
   * Used for typing
   */
  pushDebounced() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      this.pushImmediate();
    }, this.debounceDelay);
  }

  /**
   * If a debounced typing snapshot is pending, capture it NOW as its own
   * undo step. Called by CommandManager *before* running a command so the
   * sequence "type → run command" produces two undo entries (typing, then
   * command) instead of one combined entry. Without this, undo would step
   * back past both the typing and the command in a single press.
   */
  flushPending() {
    if (!this.debounceTimeout) return;
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = null;

    const snapshot = this._captureSnapshot();

    if (this.undoStack.length > 0) {
      const lastSnapshot = this.undoStack[this.undoStack.length - 1];
      const stripMarkers = (html) => html.replace(/<span id="penman-selection-marker-(start|end)" style="display: none;"><\/span>/g, '');
      if (stripMarkers(lastSnapshot.html) === stripMarkers(snapshot.html)) {
        return;
      }
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /**
   * Undoes the last action
   */
  undo() {
    if (this.undoStack.length <= 1) return; // Need at least the initial state + 1 change

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
      // Push the current pending typing state before undoing
      this.pushImmediate();
    }

    // Pop current state and move to redo
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);

    // Get previous state
    const previousState = this.undoStack[this.undoStack.length - 1];

    this._restoreSnapshot(previousState);
  }

  /**
   * Redoes the previously undone action
   */
  redo() {
    if (this.redoStack.length === 0) return;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);

    this._restoreSnapshot(nextState);
  }

  /**
   * Restores a snapshot into the editor.
   *
   * IMPORTANT: snapshot.html contains the embedded selection markers
   * (<span id="penman-selection-marker-start|end" …>). We MUST NOT route
   * this through editor.setContent(), because that path runs the sanitizer
   * which strips the `id` attribute from <span> elements per its strict
   * attribute allow-list — that would leave the markers in the DOM as
   * anonymous spans, selection.restore() would fail to locate them, and
   * the cursor would land at the first text node (= top of the document).
   *
   * The snapshot came from our own getContent(); it is already sanitized.
   * Setting innerHTML directly preserves the marker IDs and lets the
   * selection manager put the caret back exactly where the user left it.
   *
   * @param {Object} snapshot
   */
  _restoreSnapshot(snapshot) {
    if (!this.editor.editableArea) return;

    this.editor.editableArea.innerHTML = snapshot.html;
    if (typeof this.editor._syncToTextarea === 'function') {
      this.editor._syncToTextarea();
    }

    this.editor.selection.restore();

    this.editor.emit('change', this.editor.getContent());
    this.editor.emit('selectionChange');
  }
}
