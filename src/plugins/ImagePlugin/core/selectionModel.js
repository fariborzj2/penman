/**
 * Resolves the semantically valid insertion point for the image figure.
 *
 * Semantic Selection & Insertion Model (from spec):
 * Priority 1: Optional explicit range or drag/drop point.
 * Priority 2: Active Saved Marker. If `editor.selection.save()` was called explicitly.
 * Priority 3: Live Selection. Active browser selection.
 * Priority 4: Fallback. Append to the end of the primary editor root.
 *
 * The Absolute Validity Execution Law:
 * - Spatial Check: Node must exist and be contained within .penman-editor-area.
 * - Semantic Check: The node or its closest block parent MUST NOT be contenteditable="false"
 *   (e.g., another figure or table wrapper), UNLESS it is the figcaption itself.
 * - Temporal Check (The Stability Lock): The DOM must be in a stable state.
 *
 * - Caption Escape Rule: If the valid resolved node is inside a figcaption, escape it
 *   by shifting the insertion point to after the parent figure node.
 */

export function resolveInsertionPoint(editor, options = {}) {
  const root = editor.editableArea;
  const { range: explicitRange = null, point = null } = options;

  let targetRange = explicitRange;

  if (!targetRange && point) {
    targetRange = getRangeFromPoint(point.x, point.y);
  }

  if (targetRange && validateRange(targetRange, root)) {
    return buildResolvedFromRange(targetRange);
  }

  const startMarker = root.querySelector('#penman-selection-marker-start');
  const endMarker = root.querySelector('#penman-selection-marker-end');
  if (startMarker && endMarker && editor.selection && typeof editor.selection.restore === 'function') {
    editor.selection.restore();
  }

  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const liveRange = selection.getRangeAt(0);
    if (validateRange(liveRange, root)) {
      return buildResolvedFromRange(liveRange);
    }
  }

  return {
    strategy: 'FALLBACK',
    node: root
  };
}

function buildResolvedFromRange(range) {
  const targetNode = range.startContainer;
  const figcaption = targetNode.nodeType === Node.TEXT_NODE
    ? targetNode.parentElement.closest('figcaption')
    : (targetNode.tagName === 'FIGCAPTION' ? targetNode : targetNode.closest('figcaption'));

  if (figcaption) {
    const figure = figcaption.closest('figure');
    return {
      strategy: 'AFTER_NODE',
      node: figure
    };
  }

  return {
    strategy: 'RANGE',
    range
  };
}

function getRangeFromPoint(x, y) {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }

  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }
  }

  return null;
}

function validateRange(range, root) {
  if (!range || !range.startContainer) return false;
  const node = range.startContainer;

  if (!root.contains(node)) return false;
  if (!document.body.contains(node)) return false;

  return validateNode(node, root);
}

function validateNode(node, root) {
  if (!node) return false;

  let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== root) {
    if (current.tagName === 'FIGCAPTION') {
      return true;
    }
    if (current.getAttribute && current.getAttribute('contenteditable') === 'false') {
      return false;
    }
    current = current.parentNode;
  }

  return true;
}

export function insertFigureAtResolvedPoint(editor, figureNode, options = {}) {
  const resolved = resolveInsertionPoint(editor, options);

  if (resolved.strategy === 'RANGE' && resolved.range) {
    insertAtRange(resolved.range, figureNode, editor.editableArea);
  } else if (resolved.strategy === 'AFTER_NODE') {
    resolved.node.parentNode.insertBefore(figureNode, resolved.node.nextSibling);
  } else {
    editor.editableArea.appendChild(figureNode);
  }

  normalizeAfterInsert(figureNode);
}

function insertAtRange(range, figureNode, root) {
  const blockParent = getBlockParent(range.startContainer, root);

  if (blockParent && blockParent.tagName === 'FIGURE' && blockParent.classList.contains('penman-image')) {
    blockParent.parentNode.insertBefore(figureNode, blockParent.nextSibling);
    return;
  }

  if (blockParent) {
    if (blockParent.textContent.trim() === '' && blockParent.tagName === 'P') {
      blockParent.parentNode.insertBefore(figureNode, blockParent);
      blockParent.remove();
      return;
    }

    splitBlockAndInsert(range, figureNode, blockParent);
    return;
  }

  range.deleteContents();
  range.insertNode(figureNode);
}

function normalizeAfterInsert(figureNode) {
  const selection = window.getSelection();
  selection.removeAllRanges();

  const newRange = document.createRange();
  const nextNode = figureNode.nextSibling;

  if (nextNode) {
    if (nextNode.tagName === 'P') {
      newRange.setStart(nextNode, 0);
    } else {
      newRange.setStartAfter(figureNode);
    }
  } else {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    figureNode.parentNode.appendChild(p);
    newRange.setStart(p, 0);
  }

  newRange.collapse(true);
  selection.addRange(newRange);
}

function getBlockParent(node, root) {
  const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'];
  let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== root) {
    if (blockTags.includes(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function splitBlockAndInsert(range, newElement, blockParent) {
  range.deleteContents();

  const rangeToSplit = range.cloneRange();
  rangeToSplit.selectNodeContents(blockParent);
  rangeToSplit.setStart(range.startContainer, range.startOffset);

  const rightPart = rangeToSplit.extractContents();

  blockParent.parentNode.insertBefore(newElement, blockParent.nextSibling);

  if (rightPart.textContent.trim() !== '' || rightPart.querySelector('img, br')) {
    const newBlock = document.createElement(blockParent.tagName);
    newBlock.appendChild(rightPart);
    newElement.parentNode.insertBefore(newBlock, newElement.nextSibling);
  }

  if (blockParent.textContent.trim() === '' && !blockParent.querySelector('img, br')) {
    blockParent.remove();
  }
}
