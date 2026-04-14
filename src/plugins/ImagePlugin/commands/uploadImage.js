import { executeUploadPipeline } from '../core/uploadPipeline.js';

/**
 * UPLOAD IMAGE FROM DEVICE
 * - Input: File object or File[]
 * - Routes directly to the Upload Pipeline.
 */
export function uploadImageCommand(editor, files, uploadFn) {
  if (!files || !uploadFn) {
    throw new Error('Upload requires files and an uploadFn configuration.');
  }

  // Hand off to the State Machine Pipeline
  executeUploadPipeline(editor, files, uploadFn);
}
