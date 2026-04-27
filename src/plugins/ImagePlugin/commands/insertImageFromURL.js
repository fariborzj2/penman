import { validateURL, TrustLevel } from '../security/urlValidator.js';
import { createFigureNode } from '../rendering/figureRenderer.js';
import { insertFigureAtResolvedPoint } from '../core/selectionModel.js';
import { captureAtomicSnapshot } from '../history/snapshotController.js';

/**
 * INSERT IMAGE FROM URL
 * - Input: { url: string, alt?: string }
 * - Validation: Regex + length + trust
 * - Behavior: Synchronous execution, immediate fallback on error.
 */

export function insertImageFromURL(editor, { url, alt = '', trustLevel = TrustLevel.UNTRUSTED, width = null, height = null }) {
  // 1. Validation (Synchronous)
  validateURL(url, trustLevel);

  // Note: HTML sanitization rule (Section 8.1) is inherently covered by avoiding innerHTML
  // and using document.createElement in createFigureNode.

  // 2. DOM Creation
  const figureNode = createFigureNode(editor, url, alt, null, 'center', width, height);

  // 3. Selection & Insertion
  if (editor.selection && typeof editor.selection.save === 'function') {
      editor.selection.save(); // Try Priority 1 implicitly
  }

  insertFigureAtResolvedPoint(editor, figureNode);

  // 4. Snapshot
  captureAtomicSnapshot(editor);
}
