export class SelectionManager {
  constructor(editor) {
    this.editor = editor;
    this.MARKER_ID = 'penman-selection-marker';
  }

  /**
   * Gets the current window selection
   * @returns {Selection|null}
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Saves the current selection range using reliable DOM markers
   * This ensures normalization or DOM manipulation doesn't lose the cursor.
   */
  save() {
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

    // Insert end marker
    cloneRange.collapse(false);
    cloneRange.insertNode(endMarker);

    // Reset range and insert start marker
    cloneRange.setStart(range.startContainer, range.startOffset);
    cloneRange.collapse(true);
    cloneRange.insertNode(startMarker);
  }

  /**
   * Restores the selection from the DOM markers
   */
  restore() {
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
   * Internal helper to clean up marker elements
   */
  _removeMarkers() {
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
