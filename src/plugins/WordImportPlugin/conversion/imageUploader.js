// src/plugins/WordImportPlugin/conversion/imageUploader.js
//
// After docx conversion, every <img> still references a base64 data URL.
// For long documents these can balloon the saved HTML and bypass the user's
// existing image hosting pipeline. This module walks the converted HTML and,
// for every image, uploads the binary through `editor.options.imageUploadFn`
// (the same upload pipeline ImagePlugin uses) and swaps the data URL for the
// returned permanent URL.
//
// If `imageUploadFn` is not configured, we leave the data URLs in place — the
// import still works, just less efficiently. Per-image failures don't abort
// the whole import: the failed image keeps its data URL and the caller gets a
// summary of failure counts.

/**
 * Replace data: image URLs in the supplied HTML string with uploaded URLs.
 *
 * @param {string}   html          HTML returned by docx/rtf conversion
 * @param {Function} uploadFn      async (file) => { url, alt? }
 * @param {Function} [onProgress]  (done, total) => void — called as uploads finish
 * @returns {Promise<{ html: string, uploaded: number, failed: number, total: number }>}
 */
export async function uploadImagesInHtml(html, uploadFn, onProgress) {
  if (!html || typeof uploadFn !== 'function') {
    return { html, uploaded: 0, failed: 0, total: 0 };
  }

  // Use a detached DOM tree so we can swap src values without re-stringifying
  // and re-parsing for every image.
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const dataImgs = Array.from(wrapper.querySelectorAll('img'))
    .filter((img) => (img.getAttribute('src') || '').startsWith('data:'));

  const total = dataImgs.length;
  if (total === 0) {
    return { html, uploaded: 0, failed: 0, total: 0 };
  }

  let done = 0;
  let uploaded = 0;
  let failed = 0;

  // Upload with limited concurrency. Word documents can carry dozens of
  // small inline icons; firing them all at once swamps most upload
  // endpoints. Four parallel requests is a good balance.
  const CONCURRENCY = 4;
  const queue = dataImgs.slice();

  const worker = async () => {
    while (queue.length) {
      const img = queue.shift();
      try {
        const file = dataUrlToFile(img.getAttribute('src'), suggestFileName(img));
        const result = await uploadFn(file);
        const url = result && result.url;
        if (url) {
          img.setAttribute('src', url);
          uploaded += 1;
        } else {
          failed += 1;
        }
        // Clean up our import marker so it doesn't end up in the final HTML.
        img.removeAttribute('data-pm-import-image');
      } catch (_) {
        failed += 1;
        // Leave the data URL in place so the user still sees the image.
      } finally {
        done += 1;
        if (typeof onProgress === 'function') {
          try { onProgress(done, total); } catch (_) { /* noop */ }
        }
      }
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, total); i++) workers.push(worker());
  await Promise.all(workers);

  return {
    html: wrapper.innerHTML,
    uploaded,
    failed,
    total,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataUrlToFile(dataUrl, name) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) throw new Error('Invalid data URL');
  const contentType = m[1] || 'image/png';
  const binary = atob(m[2] || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = extFromMime(contentType);
  return new File([bytes], `${name}.${ext}`, { type: contentType });
}

function extFromMime(mime) {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/gif':  return 'gif';
    case 'image/svg+xml': return 'svg';
    case 'image/png':
    default:           return 'png';
  }
}

function suggestFileName(img) {
  const idx = img.getAttribute('data-pm-import-image') || '0';
  return `word-import-${Date.now()}-${idx}`;
}
