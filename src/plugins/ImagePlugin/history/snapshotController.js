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
  if (editor && editor.history) {
    editor.history.saveSnapshot();
  }
}

export function captureAtomicSnapshot(editor) {
  if (editor && editor.history) {
    editor.history.saveSnapshot();
  }
}
