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
      // Route to Upload Pipeline
      executeUploadPipeline(editor, validFiles, uploadFn);
    }
  }
}
