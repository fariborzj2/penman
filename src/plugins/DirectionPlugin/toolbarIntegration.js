/**
 * toolbarIntegration.js
 * Registers the Direction toolbar buttons via editor.ui.registry.
 *
 * Three buttons:
 *   - dirrtl  : Force RTL (locks the block)
 *   - dirltr  : Force LTR (locks the block)
 *   - dirreset: Remove lock and re-run auto-detection
 */

/**
 * @param {import('../../core/Editor').Editor} editor
 * @param {Object} config
 * @param {boolean} config.toolbar   Whether to register toolbar buttons
 * @param {Function} config.onApplyManual  Called with (block, dir) when user manually sets
 * @param {Function} config.onReset        Called with (block) when user resets
 * @param {Function} config.getBlockAtCursor  Returns the current block element or null
 */
export function registerToolbarButtons(editor, config) {
  if (!config.toolbar) return;

  const { onApplyManual, onReset, getBlockAtCursor } = config;

  // ── RTL button ──────────────────────────────────────────────────────────
  editor.ui.registry.addButton('dirrtl', {
    text: 'RTL',
    onAction: () => {
      const block = getBlockAtCursor();
      if (block) onApplyManual(block, 'rtl');
    },
  });

  // ── LTR button ──────────────────────────────────────────────────────────
  editor.ui.registry.addButton('dirltr', {
    text: 'LTR',
    onAction: () => {
      const block = getBlockAtCursor();
      if (block) onApplyManual(block, 'ltr');
    },
  });

  // ── Reset button ────────────────────────────────────────────────────────
  editor.ui.registry.addButton('dirreset', {
    text: 'Dir Auto',
    onAction: () => {
      const block = getBlockAtCursor();
      if (block) onReset(block);
    },
  });

  // ── Keep button active states in sync with cursor position ─────────────
  editor.on('selectionChange', () => {
    const block = getBlockAtCursor();
    const currentDir = block ? (block.getAttribute('dir') || 'ltr') : 'ltr';

    _setActive(editor, 'dirrtl', currentDir === 'rtl');
    _setActive(editor, 'dirltr', currentDir === 'ltr');
  });
}

function _setActive(editor, cmd, active) {
  const btn = editor.container && editor.container.querySelector(`.penman-btn-${cmd}`);
  if (!btn) return;
  if (active) {
    btn.classList.add('penman-btn-active');
  } else {
    btn.classList.remove('penman-btn-active');
  }
}
