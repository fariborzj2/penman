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
 * @param {Function} config.onApplyManualToBlocks  Called with (blocks, dir) when user manually sets
 * @param {Function} config.onResetBlocks        Called with (blocks) when user resets
 * @param {Function} config.getSelectedBlocks  Returns the currently selected block elements
 */
export function registerToolbarButtons(editor, config) {
  if (!config.toolbar) return;

  const { onApplyManualToBlocks, onResetBlocks, getSelectedBlocks } = config;

  // ── RTL button ──────────────────────────────────────────────────────────
  editor.ui.registry.addButton('dirrtl', {
    text: 'RTL',
    onAction: () => {
      const blocks = getSelectedBlocks();
      if (blocks.length > 0) onApplyManualToBlocks(blocks, 'rtl');
    },
  });

  // ── LTR button ──────────────────────────────────────────────────────────
  editor.ui.registry.addButton('dirltr', {
    text: 'LTR',
    onAction: () => {
      const blocks = getSelectedBlocks();
      if (blocks.length > 0) onApplyManualToBlocks(blocks, 'ltr');
    },
  });

  // ── Reset button ────────────────────────────────────────────────────────
  editor.ui.registry.addButton('dirreset', {
    text: 'Dir Auto',
    onAction: () => {
      const blocks = getSelectedBlocks();
      if (blocks.length > 0) onResetBlocks(blocks);
    },
  });

  // ── Keep button active states in sync with cursor position ─────────────
  editor.on('selectionChange', () => {
    const blocks = getSelectedBlocks();
    const block = blocks.length > 0 ? blocks[0] : null;
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
