import { executeUploadPipeline } from '../core/uploadPipeline.js';
import { insertImageFromURL } from './insertImageFromURL.js';

/**
 * PASTE IMAGE
 * Trigger: DOM paste event.
 * Rules:
 * - Intercept paste before default behavior.
 * - If clipboardData.files contains valid images: Route to Upload Pipeline (Concurrency max: 3).
 * - If clipboardData.getData('text/html') contains <img>: Extract src, validate, insert as URL. Drop invalid tags.
 */

export function pasteImageHandler(editor, event, uploadFn) {
  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return false;

  // Check for files first
  if (clipboardData.files && clipboardData.files.length > 0) {
    const validFiles = Array.from(clipboardData.files).filter(f => f.type.startsWith('image/'));

    if (validFiles.length > 0) {
      event.preventDefault(); // Intercept

      // Concurrency max 3
      const filesToUpload = validFiles.slice(0, 3);
      if (uploadFn) {
        executeUploadPipeline(editor, filesToUpload, uploadFn);
      } else {
        console.warn('Image upload attempted but no uploadFn provided.');
      }
      return true; // Handled
    }
  }

  // Check for HTML containing img tags
  const html = clipboardData.getData('text/html');
  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    if (images.length > 0) {
      // We must prevent default to stop the native paste from double-inserting or causing race conditions
      // with our manual DOM modification logic.
      event.preventDefault();
      event.stopImmediatePropagation();

      // For a perfectly safe fallback: Extract images, insert them sequentially, and also
      // paste the rest of the valid HTML using standard execCommand if needed.
      // But spec just says: "Extract src, validate, insert as URL. Drop invalid tags."
      // Let's insert the text and the images manually to preserve structure without racing.

      // A more robust way to keep the text is to allow the editor's Sanitizer to run,
      // but since we prevented default, we can just insert the clean text first, then images.

      const cleanText = doc.body.textContent || clipboardData.getData('text/plain') || '';

      // 1. Insert text (if any)
      if (cleanText.trim().length > 0) {
          document.execCommand('insertText', false, cleanText);
      }

      // 2. Insert extracted images synchronously
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
          try {
            // Validate and insert
            // Using UNTRUSTED by default since it's pasted from arbitrary source
            insertImageFromURL(editor, { url: src, alt: img.getAttribute('alt') || '', trustLevel: 'UNTRUSTED' });
          } catch (e) {
            // Drop invalid tags silently
          }
        }
      });

      return true;
    }
  }

  return false;
}
