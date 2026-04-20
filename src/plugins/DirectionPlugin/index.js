/**
 * DirectionPlugin barrel export.
 *
 * ─── Registration ──────────────────────────────────────────────────────────
 *
 * Option A — add to src/plugins/PluginManager.js (recommended):
 *
 *   import { setupDirectionPlugin } from './DirectionPlugin/index.js';
 *   // inside the `plugins` map:
 *   direction: setupDirectionPlugin,
 *
 * Option B — register at runtime:
 *
 *   import { setupDirectionPlugin } from './DirectionPlugin/index.js';
 *   penman.PluginManager.add('direction', setupDirectionPlugin);
 *
 *   const editor = penman.init({
 *     selector: '#editor',
 *     plugins: ['direction'],
 *     directionOptions: { default: 'rtl', toolbar: true },
 *   });
 */

export { setupDirectionPlugin } from './DirectionPlugin.js';
export { detectDirection, detectByFirstStrong, detectByRatio } from './directionDetector.js';
export { applyDirection, isSupportedBlock, isForcedLTR, stripIncomingDirection, SUPPORTED_BLOCK_TAGS } from './directionApplier.js';
export { LockManager } from './lockManager.js';
