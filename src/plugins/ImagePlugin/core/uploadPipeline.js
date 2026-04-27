import { emitImageEvent } from './eventEmitter.js';
import { captureCompletionSnapshot } from '../history/snapshotController.js';
import { createFigureNode } from '../rendering/figureRenderer.js';
import { insertFigureAtResolvedPoint } from './selectionModel.js';

/**
 * 2. Upload Pipeline (STATE MACHINE LOCKED)
 * PENDING -> UPLOADING -> SUCCESS / FAILED
 */

const UPLOAD_STATES = {
  PENDING: 'PENDING',
  UPLOADING: 'UPLOADING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
};

function generateUniqueId() {
  return 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Validates files against spec (image/png, jpeg, webp; <= 5MB)
 */
function validateFile(file) {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('INVALID_TYPE');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('FILE_TOO_LARGE');
  }
}

/**
 * Handles the upload pipeline.
 *
 * @param {Editor} editor - The Penman editor instance
 * @param {File[]} files - Array of files to upload
 * @param {Function} uploadFn - Async function(file) that returns { url: string, alt?: string }
 */
export async function executeUploadPipeline(editor, files, uploadFn, options = {}) {
  // 1. Snapshot Locked: Capture editor.selection.save() instantly.
  if (editor.selection && typeof editor.selection.save === 'function') {
    editor.selection.save();
  }

  // Ensure files is an array
  const fileArray = Array.isArray(files) ? files : [files];

  const uploadJobs = [];

  // 2. Placeholder Insertion (Order Guaranteed)
  // Rule: Multiple files are inserted sequentially. Order of DOM insertion strictly matches Array index.
  for (const file of fileArray) {
    try {
      validateFile(file);

      const dataId = generateUniqueId();
      // Temporary base64 for placeholder or just a generic placeholder icon.
      // We can use createObjectURL temporarily.
      const tempUrl = URL.createObjectURL(file);

      const figureNode = createFigureNode(editor, tempUrl, 'Uploading...', dataId);
      figureNode.classList.add('penman-image-uploading');

      // Synchronous insertion
      insertFigureAtResolvedPoint(editor, figureNode, options);

      // 6.1 Uploading Snapshot Exemption: NO history snapshot here.

      uploadJobs.push({ file, dataId, tempUrl });
    } catch (error) {
      // Validation error (INVALID_TYPE, FILE_TOO_LARGE)
      // Propagate via Async Emitter? Or sync because it's validation?
      // "validateFile" throws, we catch it per file.
      emitImageEvent(editor, 'image:uploadError', {
        code: error.message,
        message: 'File validation failed',
        context: { fileName: file.name },
        retryable: false
      });
    }
  }

  // 3. Execution: Upload executes asynchronously.
  for (const job of uploadJobs) {
    // Process async (could be concurrent, we don't await the loop itself, but rather we fire them off)
    // Wait, let's fire them asynchronously.
    handleSingleUploadJob(editor, job, uploadFn);
  }
}

async function handleSingleUploadJob(editor, job, uploadFn) {
  const { file, dataId, tempUrl } = job;

  try {
    // Extract dimensions from the temporary URL asynchronously
    const dimensions = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: null, height: null });
      img.src = tempUrl;
    });

    const result = await uploadFn(file);

    // ATOMIC MUTATION LAW (SUCCESS)
    applyAtomicMutation(editor, dataId, (imgNode, figureNode) => {
      // 1. Mutate DOM state
      imgNode.setAttribute('src', result.url);

      if (dimensions.width) imgNode.setAttribute('width', dimensions.width);
      if (dimensions.height) imgNode.setAttribute('height', dimensions.height);

      if (result.alt) {
        imgNode.setAttribute('alt', result.alt);
      } else {
        imgNode.removeAttribute('alt');
      }
      figureNode.classList.remove('penman-image-uploading');
      URL.revokeObjectURL(tempUrl); // cleanup

      // 2. Trigger History Snapshot
      captureCompletionSnapshot(editor, dataId);

      // 3. Emit lifecycle event
      emitImageEvent(editor, 'image:uploadSuccess', {
        context: { dataId, url: result.url }
      });
    });

  } catch (error) {
    // ATOMIC MUTATION LAW (FAILED)
    applyAtomicMutation(editor, dataId, (imgNode, figureNode) => {
      // Mutate DOM state (render error UI)
      figureNode.classList.remove('penman-image-uploading');
      figureNode.classList.add('penman-image-error');
      URL.revokeObjectURL(tempUrl); // cleanup

      // Emit lifecycle event
      emitImageEvent(editor, 'image:uploadError', {
        code: 'UPLOAD_FAILED',
        message: error.message || 'Upload failed',
        context: { dataId },
        retryable: true
      });

      // Note: No history snapshot on FAILED.
    });
  }
}

/**
 * 7.2 The Atomic Event-Mutation Law (Race Boundary Lock)
 */
function applyAtomicMutation(editor, dataId, mutationBlockFn) {
  const root = editor.editableArea;
  // 1. Pre-Emission Live Check
  const imgNode = root.querySelector(`img[data-id="${dataId}"]`);

  // 3. The Absolute Drop Rule: If null, drop entirely.
  if (!imgNode) {
    return;
  }

  const figureNode = imgNode.closest('figure');

  // 2. Atomic Execution Block
  mutationBlockFn(imgNode, figureNode);
}
