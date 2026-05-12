export class SelectionManager {
  constructor(editor) {
    this.editor = editor;
    this.MARKER_ID = 'penman-selection-marker';
    this.selectedNode = null;
    // Stores character offsets for save/restore
    this._savedOffsets = null;
  }

  /**
   * Gets the current window selection
   * @returns {Selection|null}
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Returns the character offset of a boundary point (container + offset)
   * relative to a root element, counting only text node characters.
   * @private
   */
  _getCharOffset(root, container, offset) {
    let charCount = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node === container) {
        return charCount + offset;
      }
      charCount += node.textContent.length;
    }
    return charCount;
  }

  /**
   * Resolves a character offset back to a {node, offset} boundary point
   * relative to a root element.
   * @private
   */
  _resolveCharOffset(root, charOffset) {
    let charCount = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      if (charCount + len >= charOffset) {
        return { node, offset: charOffset - charCount };
      }
      charCount += len;
    }
    // Fallback: end of last text node
    return node ? { node, offset: node.textContent.length } : null;
  }

  /**
   * Saves the current selection range using character offsets relative to
   * the editable area. This is immune to DOM mutations that split/move nodes.
   */
  save() {
    this.clearNodeSelection();
    this._savedOffsets = null;

    const sel = this.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const root = this.editor.editableArea;

    if (!root.contains(range.commonAncestorContainer)) return;

    const startOffset = this._getCharOffset(root, range.startContainer, range.startOffset);
    const endOffset = this._getCharOffset(root, range.endContainer, range.endOffset);

    this._savedOffsets = { startOffset, endOffset };
  }

  /**
   * Cleans up saved state without changing focus or selection.
   */
  clearSaved() {
    this._savedOffsets = null;
    // Also clean up any legacy markers that may exist
    this._removeMarkers();
  }

  /**
   * Restores the selection from the saved character offsets.
   */
  restore() {
    this.clearNodeSelection();
    this.editor.focus();

    if (!this._savedOffsets) return;

    const { startOffset, endOffset } = this._savedOffsets;
    this._savedOffsets = null;

    const root = this.editor.editableArea;
    const startPoint = this._resolveCharOffset(root, startOffset);
    const endPoint = this._resolveCharOffset(root, endOffset);

    if (!startPoint || !endPoint) return;

    try {
      const sel = this.getSelection();
      const range = document.createRange();
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {
      // Ignore — selection is best-effort after complex DOM mutations
    }
  }

  /**
   * Selects a whole block node
   * @param {HTMLElement} node
   */
  selectNode(node) {
    this.clearNodeSelection();

    // Perform native browser selection of the node
    // This allows browser Copy/Cut commands to work natively.
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
   * Internal helper to clean up legacy marker elements (kept for compatibility)
   * @private
   */
  _removeMarkers() {
    const startMarker = this.editor.editableArea
      ? this.editor.editableArea.querySelector(`#${this.MARKER_ID}-start`)
      : null;
    const endMarker = this.editor.editableArea
      ? this.editor.editableArea.querySelector(`#${this.MARKER_ID}-end`)
      : null;

    if (startMarker && startMarker.parentNode) {
      startMarker.parentNode.removeChild(startMarker);
    }
    if (endMarker && endMarker.parentNode) {
      endMarker.parentNode.removeChild(endMarker);
    }
  }
}
