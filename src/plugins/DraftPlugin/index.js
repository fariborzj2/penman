/**
 * DraftPlugin barrel export.
 *
 * ─── Registration ──────────────────────────────────────────────────────────
 *
 * Option A — add to src/plugins/PluginManager.js (recommended):
 *
 *   import { setupDraftPlugin } from './DraftPlugin/index.js';
 *   // inside the `plugins` map:
 *   draft: setupDraftPlugin,
 *
 * Option B — register at runtime without modifying core files:
 *
 *   import { setupDraftPlugin } from './DraftPlugin/index.js';
 *   penman.PluginManager.add('draft', setupDraftPlugin);
 *
 *   const editor = penman.init({
 *     selector: '#editor',
 *     plugins: ['draft'],
 *     draftDocumentId: 'post-42',
 *   });
 */

export { setupDraftPlugin } from './DraftPlugin.js';
export { DraftManager }     from './DraftManager.js';
export { DraftStorage }     from './DraftStorage.js';
