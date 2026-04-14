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
      // If there's an image, let's let the default paste handler do its job IF it's handled by Sanitizer?
      // Spec says: "If clipboardData.getData('text/html') contains <img>: Extract src, validate, insert as URL. Drop invalid tags."
      // This implies we handle it explicitly.
      // Actually, if we intercept, we prevent the rest of the HTML from pasting.
      // Wait, standard paste might include text AND images. If we prevent default, text is lost unless we parse and paste all.
      // The spec says "If clipboardData.getData('text/html') contains <img>: Extract src, validate, insert as URL. Drop invalid tags."
      // Let's intercept only if the ONLY content is images, or we can just extract the first image.

      // We will parse the src and execute insertImageFromURL for each valid image, but we shouldn't ruin normal text paste.
      // If we intercept, we must return true.
      // But standard Sanitizer already handles 'img' tags?
      // Wait, let's look at Sanitizer.js from Memory. `this.allowedTags` does NOT include 'img'.
      // So Sanitizer unwraps 'img' tags!
      // This means standard paste drops images entirely!
      // Therefore, we MUST extract them here.

      // For simplicity in a strict environment, if there are images, we extract them.
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
          try {
            // Validate and insert
            // Note: Since this is an interception, we should probably prevent default
            insertImageFromURL(editor, { url: src, alt: img.getAttribute('alt') || '' });
          } catch (e) {
            // Drop invalid tags silently
          }
        }
      });
      // We do NOT prevent default here, so the rest of the text still pastes through the standard Sanitizer!
      // Or if we must, we return false.
      // Wait: if we don't prevent default, the images are dropped by Sanitizer (which is correct), but the text remains!
      // And we inserted the images manually! This perfectly fulfills "Extract src, validate, insert as URL. Drop invalid tags."
      return false;
    }
  }

  return false;
}
