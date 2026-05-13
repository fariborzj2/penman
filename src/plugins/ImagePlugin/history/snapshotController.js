/**
 * 6. HISTORY MANAGER: CONCURRENCY & ORDERING CONTRACT
 * 6.1 Uploading Snapshot Exemption
 * The insertion of the PENDING/UPLOADING placeholder MUST NOT trigger a history snapshot.
 *
 * 6.2 The Completion Snapshot (Concurrency Resolved)
 * A history snapshot is captured ONLY at the exact millisecond an upload transitions to SUCCESS and mutates the DOM.
 * Concurrency Rule: History Order = Completion Order. Snapshots are triggered per file completion.
 * Edge Case Lock: If the placeholder is deleted before the upload finishes, the async handler aborts state application, and NO history snapshot is fired.
 *
 * 6.3 Standard Operations
 * INSERT_IMAGE (URL/Gallery), Deletion, and Alignment changes each trigger exactly ONE atomic snapshot.
 */

export function captureCompletionSnapshot(editor, dataId) {
  // Edge Case Lock is enforced at the caller level via Atomic Mutation Block.
  // When this is called, the DOM mutation is already SUCCESS and done.
  if (!editor) return;
  if (editor.history) editor.history.pushImmediate();
  // Tell the rest of the editor (DraftPlugin auto-save, textarea sync,
  // listeners) that the document changed. pushImmediate alone updates the
  // undo stack but does not emit, which previously left the draft store
  // unaware of newly inserted images until the user typed something.
  _emitChange(editor);
}

export function captureAtomicSnapshot(editor) {
  if (!editor) return;
  if (editor.history) editor.history.pushImmediate();
  _emitChange(editor);
}

function _emitChange(editor) {
  try {
    if (typeof editor._syncToTextarea === 'function') editor._syncToTextarea();
    if (typeof editor.emit === 'function' && typeof editor.getContent === 'function') {
      editor.emit('change', editor.getContent());
    }
  } catch (_) { /* never let snapshot bookkeeping crash the editor */ }
}
