export class SelectionManager {
  constructor(editor) {
    this.editor = editor;
    this.MARKER_ID = 'penman-selection-marker';
    this.selectedNode = null;
  }

  /**
   * Gets the current window selection
   * @returns {Selection|null}
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Saves the current selection range using reliable DOM markers.
   *
   * Markers are inserted as invisible <span> elements at the selection
   * boundaries. They are immune to mismatches between text-node offsets and
   * the visible cursor position (e.g. when the cursor sits inside an empty
   * paragraph like <p><br></p>) because they occupy the cursor's location
   * physically in the DOM.
   *
   * Character-offset-based persistence was tried in earlier iterations but
   * cannot represent a cursor inside an element with no preceding text
   * (the common case after Cmd/Ctrl+Enter creates an empty paragraph);
   * restore would land at the end of the previous block instead.
   */
  save() {
    this.clearNodeSelection();
    const sel = this.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // Ensure the selection is actually inside our editable area
    if (!this.editor.editableArea.contains(range.commonAncestorContainer)) {
      return;
    }

    // Remove any existing markers first
    this._removeMarkers();

    // Create markers
    const startMarker = document.createElement('span');
    startMarker.id = `${this.MARKER_ID}-start`;
    startMarker.style.display = 'none';

    const endMarker = document.createElement('span');
    endMarker.id = `${this.MARKER_ID}-end`;
    endMarker.style.display = 'none';

    // Clone the range so we don't instantly break the user's active selection while mutating
    const cloneRange = range.cloneRange();

    // Insert end marker first (collapsing the cloned range to its end)
    cloneRange.collapse(false);
    cloneRange.insertNode(endMarker);

    // Reset range and insert start marker
    cloneRange.setStart(range.startContainer, range.startOffset);
    cloneRange.collapse(true);
    cloneRange.insertNode(startMarker);
  }

  /**
   * Cleans up markers from the DOM without changing focus or selection.
   * Useful when a saved selection is no longer needed.
   */
  clearSaved() {
    this._removeMarkers();
  }

  /**
   * Restores the selection from the DOM markers.
   */
  restore() {
    this.clearNodeSelection();
    this.editor.focus();

    const startMarker = this.editor.editableArea.querySelector(`#${this.MARKER_ID}-start`);
    const endMarker = this.editor.editableArea.querySelector(`#${this.MARKER_ID}-end`);

    if (startMarker && endMarker) {
      const sel = this.getSelection();
      const range = document.createRange();

      range.setStartAfter(startMarker);
      range.setEndBefore(endMarker);

      sel.removeAllRanges();
      sel.addRange(range);

      // Clean up markers
      this._removeMarkers();
    } else {
      // Fallback if markers are lost
      this._removeMarkers();
    }
  }

  /**
   * Selects a whole block node
   * @param {HTMLElement} node
   */
  selectNode(node) {
    this.clearNodeSelection();

    // Perform native browser selection of the node so the browser's Copy/Cut
    // commands work natively.
    const sel = this.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNode(node);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    this.selectedNode = node;
    this.selectedNode.classList.add('penman-selected-node');

    this.editor.emit('nodeSelected', node);
    this.editor.emit('selectionChange');
  }

  /**
   * Clears the current node selection
   */
  clearNodeSelection() {
    if (this.selectedNode) {
      this.selectedNode.classList.remove('penman-selected-node');
      this.selectedNode = null;
      this.editor.emit('nodeSelected', null);
      this.editor.emit('selectionChange');
    }
  }

  /**
   * Gets the currently selected node
   * @returns {HTMLElement|null}
   */
  getSelectedNode() {
    return this.selectedNode;
  }

  /**
   * Internal helper to clean up marker elements
   * @private
   */
  _removeMarkers() {
    if (!this.editor.editableArea) return;
    const startMarker = this.editor.editableArea.querySelector(`#${this.MARKER_ID}-start`);
    const endMarker = this.editor.editableArea.querySelector(`#${this.MARKER_ID}-end`);

    if (startMarker && startMarker.parentNode) {
      startMarker.parentNode.removeChild(startMarker);
    }
    if (endMarker && endMarker.parentNode) {
      endMarker.parentNode.removeChild(endMarker);
    }
  }
}
