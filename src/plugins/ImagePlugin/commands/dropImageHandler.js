import { executeUploadPipeline } from '../core/uploadPipeline.js';

/**
 * DRAG & DROP IMAGE
 * Trigger: DOM drop event within editor container.
 * Rules:
 * - Intercept drop. Prevent default browser behavior unconditionally.
 * - If dataTransfer.files contains valid images: Route to Upload Pipeline. Drop non-images silently.
 */

export function dropImageHandler(editor, event, uploadFn) {
  // Prevent default browser behavior unconditionally
  event.preventDefault();

  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;

  if (dataTransfer.files && dataTransfer.files.length > 0) {
    const validFiles = Array.from(dataTransfer.files).filter(f => f.type.startsWith('image/'));

    if (validFiles.length > 0 && uploadFn) {
      const dropRange = getRangeFromPoint(event.clientX, event.clientY);
      executeUploadPipeline(editor, validFiles, uploadFn, { range: dropRange });
    }
  }
}

function getRangeFromPoint(x, y) {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }

  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }
  }

  return null;
}
