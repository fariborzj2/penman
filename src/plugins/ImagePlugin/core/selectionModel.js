/**
 * Resolves the semantically valid insertion point for the image figure.
 *
 * Semantic Selection & Insertion Model (from spec):
 * Priority 1: Active Saved Marker. If `editor.selection.save()` was called explicitly.
 * Priority 2: Live Selection. Active browser selection.
 * Priority 3: Fallback. Append a new <p><br></p> containing the figure to the absolute end of the primary .penman-editor-area root.
 *
 * The Absolute Validity Execution Law:
 * - Spatial Check: Node must exist and be contained within .penman-editor-area.
 * - Semantic Check: The node or its closest block parent MUST NOT be contenteditable="false"
 *   (e.g., another figure or table wrapper), UNLESS it is the figcaption itself.
 * - Temporal Check (The Stability Lock): The DOM must be in a stable state. Pending
 *   MutationObserver microtasks / detached nodes means INVALID.
 *
 * - Caption Escape Rule: If the valid resolved node is inside a figcaption, escape it
 *   by shifting the insertion point to *after* the parent figure node.
 */

export function resolveInsertionPoint(editor) {
  const root = editor.editableArea;

  // Temporal check - for our basic Vanilla JS editor, it's hard to synchronously check for pending
  // MutationObserver microtasks, but we can verify node attachment.

  let targetNode = null;
  let targetOffset = 0;

  // Try Priority 1: Saved Marker
  const savedMarkers = root.querySelectorAll('span[data-penman-marker]');
  if (savedMarkers.length > 0) {
    targetNode = savedMarkers[0].parentNode;
    // We could restore selection, but we just need a node to work with.
    // Or actually, we can restore it and use Priority 2 logic.
    editor.selection.restore();
  }

  // Priority 2: Live Selection
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    targetNode = range.startContainer;
    targetOffset = range.startOffset;
  }

  const isValid = validateNode(targetNode, root);

  if (isValid) {
    // Process Caption Escape Rule
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

    // Valid node, insert at selection/range
    return {
      strategy: 'RANGE',
      node: targetNode,
      range: window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null
    };
  }

  // Priority 3: Fallback
  return {
    strategy: 'FALLBACK',
    node: root
  };
}

function validateNode(node, root) {
  if (!node) return false;

  // Spatial Check
  if (!root.contains(node)) return false;

  // Temporal Check (attachment)
  if (!document.body.contains(node)) return false;

  // Semantic Check
  // The node or its closest block parent MUST NOT be contenteditable="false", UNLESS it is figcaption.
  let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== root) {
    if (current.tagName === 'FIGCAPTION') {
      return true; // Allowed (will be escaped later)
    }
    if (current.getAttribute && current.getAttribute('contenteditable') === 'false') {
      return false;
    }
    current = current.parentNode;
  }

  return true;
}

export function insertFigureAtResolvedPoint(editor, figureNode) {
  const resolved = resolveInsertionPoint(editor);

  if (resolved.strategy === 'RANGE' && resolved.range) {
    const range = resolved.range;

    // If we're inside an empty paragraph, we could replace it, but the safest
    // is to just insert. However, figures are block elements. Inserting a figure
    // into a paragraph might break HTML structure.

    // Wait, the spec doesn't specify splitting paragraphs like Horizontal Rule does.
    // It says "insert based on Semantic Selection Model".
    // Wait, Penman Editor memory says: "Inserting a Horizontal Rule (<hr>) must split the current block-level element (e.g., paragraph) rather than embedding the <hr> within it, ensuring valid DOM structure."
    // Figure is also a block element, so we should probably split or insert after the block.
    // Let's use the range to insert the figure.

    const blockParent = getBlockParent(resolved.node, editor.editableArea);

    if (blockParent) {
       // If empty block, replace it? Or just insert before?
       if (blockParent.textContent.trim() === '' && blockParent.tagName === 'P') {
           blockParent.parentNode.insertBefore(figureNode, blockParent);
           blockParent.parentNode.removeChild(blockParent);
       } else {
           // We insert it after the current block parent to keep valid DOM, or split?
           // Let's insert after for simplicity, unless we are splitting text.
           // Actually, splitting block is standard.
           splitBlockAndInsert(range, figureNode, blockParent);
       }
    } else {
      range.deleteContents();
      range.insertNode(figureNode);
    }
  } else if (resolved.strategy === 'AFTER_NODE') {
    resolved.node.parentNode.insertBefore(figureNode, resolved.node.nextSibling);
  } else {
    // FALLBACK
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    resolved.node.appendChild(figureNode);
    resolved.node.appendChild(p);
  }

  // Normalize selection after insert
  const selection = window.getSelection();
  selection.removeAllRanges();
  const newRange = document.createRange();
  // Select right after the figure
  const nextNode = figureNode.nextSibling;
  if (nextNode) {
      if (nextNode.tagName === 'P') {
          newRange.setStart(nextNode, 0);
          newRange.collapse(true);
      } else {
          newRange.setStartAfter(figureNode);
          newRange.collapse(true);
      }
  } else {
      // Create trailing p br
      const p = document.createElement('p');
      p.appendChild(document.createElement('br'));
      figureNode.parentNode.appendChild(p);
      newRange.setStart(p, 0);
      newRange.collapse(true);
  }
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
  // Simple split logic:
  range.deleteContents();

  // Extract contents from range to end of block
  const rangeToSplit = range.cloneRange();
  rangeToSplit.selectNodeContents(blockParent);
  rangeToSplit.setStart(range.startContainer, range.startOffset);

  const rightPart = rangeToSplit.extractContents();

  // Insert newElement after the current block
  blockParent.parentNode.insertBefore(newElement, blockParent.nextSibling);

  // Insert the right part into a new block of the same type if it has content
  if (rightPart.textContent.trim() !== '' || rightPart.querySelector('img, br')) {
      const newBlock = document.createElement(blockParent.tagName);
      newBlock.appendChild(rightPart);
      newElement.parentNode.insertBefore(newBlock, newElement.nextSibling);
  }

  // If the left part is empty, remove it or add <br>
  if (blockParent.textContent.trim() === '' && !blockParent.querySelector('img, br')) {
      blockParent.parentNode.removeChild(blockParent);
  }
}
