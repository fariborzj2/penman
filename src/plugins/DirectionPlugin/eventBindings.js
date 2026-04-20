/**
 * eventBindings.js
 * Hooks into editor lifecycle events to trigger auto-direction detection.
 *
 * Triggers:
 *   - onInput     (debounced, affected block only)
 *   - onPaste     (strip incoming dir, re-detect after insertion)
 *   - onBlockCreate (Enter at end of block → new block inherits auto-detection)
 *   - onChange    (undo/redo restores direction — re-scan affected area)
 *   - selectionChange (toolbar sync)
 */

import { isSupportedBlock, isForcedLTR, stripIncomingDirection } from './directionApplier.js';

/**
 * @param {import('../../core/Editor').Editor} editor
 * @param {Object} config
 * @param {number}   config.debounce          Debounce delay in ms
 * @param {string[]} config.ignore             Tag names that skip detection
 * @param {Function} config.processBlock       (block) → void  — run detect+apply
 * @param {Function} config.processAllBlocks   ()    → void  — full document scan
 * @param {Function} config.getBlockAtCursor   ()    → Element|null
 */
export function bindEvents(editor, config) {
  const {
    debounce: debounceMs,
    ignore,
    processBlock,
    processAllBlocks,
    getBlockAtCursor,
  } = config;

  const ignoredTags = new Set((ignore || []).map(t => t.toUpperCase()));

  // ── Input handler (debounced, per block) ─────────────────────────────────
  let inputTimer = null;

  function onInput() {
    if (inputTimer) clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      inputTimer = null;
      const block = getBlockAtCursor();
      if (block && !ignoredTags.has(block.tagName)) {
        processBlock(block);
      }
    }, debounceMs);
  }

  editor.editableArea.addEventListener('input', onInput);

  // ── Paste handler ─────────────────────────────────────────────────────────
  // Strip incoming dir attributes, then re-scan all blocks after paste settles.
  // We hook into the editor's paste pipeline via a MutationObserver one-shot
  // (safer than intercepting the paste event since the editor already handles it).

  let pasteObserver = null;

  editor.editableArea.addEventListener('paste', () => {
    // Set up a one-shot MutationObserver to catch the DOM changes from paste.
    if (pasteObserver) pasteObserver.disconnect();

    pasteObserver = new MutationObserver(() => {
      pasteObserver.disconnect();
      pasteObserver = null;

      // Strip any `dir` attributes that arrived with pasted HTML.
      stripIncomingDirection(editor.editableArea);

      // Re-scan all blocks because paste may span multiple blocks.
      processAllBlocks();
    });

    pasteObserver.observe(editor.editableArea, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Safety: disconnect after 1 second even if no mutations fire.
    setTimeout(() => {
      if (pasteObserver) {
        pasteObserver.disconnect();
        pasteObserver = null;
      }
    }, 1000);
  });

  // ── Change event (covers undo/redo via editor.history) ───────────────────
  // The editor emits 'change' after undo/redo restores content.
  // We re-scan all blocks because direction state may have been wiped.
  editor.on('change', () => {
    // Use a short timeout to let the DOM settle after setContent().
    setTimeout(() => processAllBlocks(), 0);
  });
}
