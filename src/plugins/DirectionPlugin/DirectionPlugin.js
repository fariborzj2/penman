/**
 * DirectionPlugin.js
 * Intelligently applies RTL / LTR direction to block-level elements
 * in mixed-language content (Persian, Arabic, English, …).
 *
 * Usage:
 *   penman.init({
 *     plugins: ['direction'],
 *     directionOptions: {
 *       auto: true,
 *       default: 'rtl',
 *       toolbar: true,
 *       detection: {
 *         strategy: 'first-strong', // or 'ratio'
 *         sampleSize: 120,
 *         rtlThreshold: 0.3,
 *       },
 *       debounce: 150,
 *       ignore: ['pre', 'code'],
 *       lock: {
 *         attribute: 'data-dir-lock',
 *         persistOnEmpty: false,
 *       },
 *     },
 *   });
 */

import { detectDirection } from './directionDetector.js';
import { applyDirection, isSupportedBlock, isForcedLTR, SUPPORTED_BLOCK_TAGS } from './directionApplier.js';
import { LockManager } from './lockManager.js';
import { registerToolbarButtons } from './toolbarIntegration.js';
import { bindEvents } from './eventBindings.js';

export function setupDirectionPlugin(editor) {
  // ── Resolve options ──────────────────────────────────────────────────────
  const raw = editor.options.directionOptions || {};

  const cfg = {
    auto:    raw.auto    !== false,          // default: true
    default: raw.default || 'ltr',
    toolbar: raw.toolbar !== false,          // default: true

    detection: {
      strategy:     (raw.detection && raw.detection.strategy)     || 'first-strong',
      sampleSize:   (raw.detection && raw.detection.sampleSize)   || 120,
      rtlThreshold: (raw.detection && raw.detection.rtlThreshold) || 0.3,
      fallback:     raw.default || 'ltr',
    },

    debounce: typeof raw.debounce === 'number' ? raw.debounce : 150,

    ignore: Array.isArray(raw.ignore)
      ? raw.ignore.map(t => t.toUpperCase())
      : ['PRE', 'CODE'],

    lock: {
      attribute:      (raw.lock && raw.lock.attribute)      || 'data-dir-lock',
      persistOnEmpty: (raw.lock && raw.lock.persistOnEmpty) !== false,
    },
  };

  const ignoredTags = new Set(cfg.ignore);
  const lockManager = new LockManager(cfg.lock);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Returns the plain text of a block, suitable for direction detection.
   * Excludes child block elements to avoid cross-contamination.
   * @param {Element} block
   */
  function getBlockText(block) {
    // Collect text nodes and inline element text only (not nested blocks).
    let text = '';
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        // Skip nested block elements (their own detection will run separately).
        if (node.nodeType === Node.ELEMENT_NODE && isSupportedBlock(node) && node !== block) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) text += n.nodeValue;
      n = walker.nextNode();
    }
    return text;
  }

  /**
   * Returns the block-level ancestor of the cursor (or null).
   * @returns {Element|null}
   */
  function getBlockAtCursor() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    let node = sel.anchorNode;
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    while (node && node !== editor.editableArea) {
      if (isSupportedBlock(node) && editor.editableArea.contains(node)) return node;
      node = node.parentNode;
    }
    return null;
  }

  /**
   * Run auto-detection on a single block and apply the result.
   * No-ops if the block is locked, ignored, or forced LTR.
   * @param {Element} block
   */
  function processBlock(block) {
    if (!isSupportedBlock(block)) return;
    if (ignoredTags.has(block.tagName)) return;
    if (isForcedLTR(block)) {
      applyDirection(block, 'ltr');
      return;
    }

    // Honour lock
    lockManager.handleEmpty(block);
    if (lockManager.isLocked(block)) return;

    if (!cfg.auto) return;

    const text = getBlockText(block);

    if (!text.trim()) {
      // Empty block → apply default direction
      applyDirection(block, cfg.default);
      return;
    }

    const dir = detectDirection(text, cfg.detection);
    applyDirection(block, dir);
  }

  /**
   * Scan all blocks in the editable area and (re-)apply direction.
   * Locked blocks are respected.
   */
  function processAllBlocks() {
    const walker = document.createTreeWalker(editor.editableArea, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (isSupportedBlock(node)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      },
    });

    const blocks = [];
    let n = walker.nextNode();
    while (n) { blocks.push(n); n = walker.nextNode(); }

    blocks.forEach(processBlock);
  }

  // ── Manual override ──────────────────────────────────────────────────────

  /**
   * Called when the user explicitly sets a direction via the toolbar.
   * Locks the block to prevent auto-override.
   * @param {Element} block
   * @param {'ltr'|'rtl'} dir
   */
  function onApplyManual(block, dir) {
    applyDirection(block, dir);
    lockManager.lock(block);

    if (editor.history) editor.history.pushImmediate();
    editor.emit('change', editor.getContent());
    editor._syncToTextarea();
  }

  /**
   * Called when the user clicks the Reset button.
   * Unlocks the block and immediately re-runs detection.
   * @param {Element} block
   */
  function onReset(block) {
    lockManager.unlock(block);
    processBlock(block);

    if (editor.history) editor.history.pushImmediate();
    editor.emit('change', editor.getContent());
    editor._syncToTextarea();
  }

  // ── Register commands ─────────────────────────────────────────────────────

  editor.commands.register('SET_DIR_RTL', {
    queryState: () => {
      const block = getBlockAtCursor();
      return block ? block.getAttribute('dir') === 'rtl' : false;
    },
    execute: (ed) => {
      const block = getBlockAtCursor();
      if (block) onApplyManual(block, 'rtl');
    },
  });

  editor.commands.register('SET_DIR_LTR', {
    queryState: () => {
      const block = getBlockAtCursor();
      return block ? block.getAttribute('dir') === 'ltr' : false;
    },
    execute: (ed) => {
      const block = getBlockAtCursor();
      if (block) onApplyManual(block, 'ltr');
    },
  });

  editor.commands.register('RESET_DIR', {
    queryState: () => false,
    execute: (ed) => {
      const block = getBlockAtCursor();
      if (block) onReset(block);
    },
  });

  // ── Toolbar ───────────────────────────────────────────────────────────────

  registerToolbarButtons(editor, {
    toolbar: cfg.toolbar,
    onApplyManual,
    onReset,
    getBlockAtCursor,
  });

  // ── Event bindings ────────────────────────────────────────────────────────

  bindEvents(editor, {
    debounce: cfg.debounce,
    ignore: cfg.ignore,
    processBlock,
    processAllBlocks,
    getBlockAtCursor,
  });

  // ── Initial scan ──────────────────────────────────────────────────────────
  // Run once after the editor is fully initialised.
  setTimeout(() => processAllBlocks(), 0);

  // ── Public API ────────────────────────────────────────────────────────────

  editor.direction = {
    /**
     * Programmatically set the direction of the block containing the cursor.
     * @param {'ltr'|'rtl'} dir
     */
    set: (dir) => {
      const block = getBlockAtCursor();
      if (block) onApplyManual(block, dir);
    },

    /**
     * Reset the direction of the block containing the cursor (remove lock).
     */
    reset: () => {
      const block = getBlockAtCursor();
      if (block) onReset(block);
    },

    /**
     * Force a full re-scan of the entire editable area.
     */
    refresh: () => processAllBlocks(),

    /**
     * Returns the detected direction of a plain-text string
     * (useful for external callers).
     * @param {string} text
     * @returns {'ltr'|'rtl'}
     */
    detect: (text) => detectDirection(text, cfg.detection),
  };
}
