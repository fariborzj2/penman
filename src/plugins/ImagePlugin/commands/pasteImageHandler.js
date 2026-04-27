import { executeUploadPipeline } from '../core/uploadPipeline.js';
import { validateURL, TrustLevel } from '../security/urlValidator.js';
import { createFigureNode } from '../rendering/figureRenderer.js';


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

      // Preserve the entire HTML structure (Block nodes + Images).
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (!src) {
          // Drop if no src
          const parentFigure = img.closest('figure');
          if (parentFigure) {
            parentFigure.remove();
          } else {
            img.remove();
          }
          return;
        }

        try {
          // Validate using UNTRUSTED by default
          validateURL(src, TrustLevel.UNTRUSTED);

          // Check if it's already well-formed inside a Penman figure
          const parentFigure = img.closest('figure.penman-image');
          if (!parentFigure) {
            // Wrap in a well-formed figure
            const figureNode = createFigureNode(editor, src, img.getAttribute('alt') || '');
            img.parentNode.replaceChild(figureNode, img);
          }
        } catch (e) {
          // Drop invalid images silently
          const parentFigure = img.closest('figure');
          if (parentFigure) {
            parentFigure.remove();
          } else {
            img.remove();
          }
        }
      });

      const processedHtml = doc.body.innerHTML;

      // Let the editor's sanitizer clean the result, preserving the correct structure
      const safeHtml = editor.sanitizer ? editor.sanitizer.sanitize(processedHtml) : processedHtml;

      if (safeHtml) {
        editor.insertContent(safeHtml);
      }

      return true;
    }
  }

  return false;
}
