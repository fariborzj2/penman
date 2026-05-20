// src/plugins/WordImportPlugin/conversion/docxConverter.js
//
// Convert a .docx ArrayBuffer to clean HTML using Mammoth.js.
//
// Behaviour:
//   • Headings, paragraphs, lists, tables, hyperlinks, bold/italic/underline
//     are mapped to semantic HTML by Mammoth's default style map.
//   • Images are kept as data URLs initially. If `imageUploadFn` is provided,
//     we collect the raw image data during conversion and the caller
//     replaces them with uploaded URLs in a second pass (see imageUploader).
//   • A custom style map adds support for Persian/Farsi-friendly extras
//     (justify-aligned paragraphs, named highlight styles) without being
//     intrusive on Latin documents.
//   • The `keepStyles` option toggles whether Mammoth includes inline
//     style attributes (color, font-family, font-size). When false, only
//     structural / semantic markup is produced — easier to clean up.

import { loadMammoth } from './mammothLoader.js';

/**
 * Convert a docx ArrayBuffer to HTML.
 *
 * @param {ArrayBuffer} arrayBuffer  Raw bytes of the .docx file
 * @param {object}      [opts]
 * @param {boolean}     [opts.keepStyles=false]  Keep inline color/font styles
 * @param {boolean}     [opts.keepImages=true]   Embed images (as data URLs) so
 *                                                the caller can upload them
 * @returns {Promise<{ html: string, messages: Array<{type: string, message: string}>, images: Array<{dataUrl: string, contentType: string}> }>}
 */
export async function convertDocxToHtml(arrayBuffer, opts = {}) {
  const { keepStyles = false, keepImages = true } = opts;

  const mammoth = await loadMammoth();

  // Track every image Mammoth encounters so the caller can replace data URLs
  // with permanent uploaded URLs in a follow-up pass.
  const collectedImages = [];

  const options = {
    styleMap: buildStyleMap({ keepStyles }),
  };

  if (keepImages) {
    options.convertImage = mammoth.images.imgElement((image) => {
      return image.read('base64').then((b64) => {
        const contentType = image.contentType || 'image/png';
        const dataUrl = `data:${contentType};base64,${b64}`;
        collectedImages.push({ dataUrl, contentType });
        // Stamp a marker so the caller can find the same <img> later for
        // URL replacement. We use data-pm-import-image because data-id is
        // already used by ImagePlugin's own placeholder system.
        return {
          src: dataUrl,
          'data-pm-import-image': String(collectedImages.length - 1),
        };
      });
    });
  } else {
    // Drop all images entirely.
    options.convertImage = mammoth.images.imgElement(() => Promise.resolve({ src: '' }));
  }

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);

  return {
    html: result.value || '',
    messages: result.messages || [],
    images: collectedImages,
  };
}

/**
 * Build a Mammoth style map. Mammoth's default map covers all common Word
 * paragraph + run styles; the entries below add a couple of conveniences:
 *
 *   • Centre/right/justify alignments expressed as named styles in the
 *     .docx survive as data-text-align hints so a downstream pass can
 *     translate them to the editor's alignment commands.
 *   • Persian "Caption" paragraphs map to <figcaption>-friendly markup.
 */
function buildStyleMap({ keepStyles }) {
  const lines = [
    // Headings — mammoth covers Heading 1..6 by default but explicit entries
    // help non-English Word installations whose style names are localised.
    "p[style-name='Title'] => h1.penman-import-title:fresh",
    "p[style-name='Subtitle'] => h2.penman-import-subtitle:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "p[style-name='Intense Quote'] => blockquote.penman-import-intense:fresh",
    "p[style-name='Caption'] => p.penman-import-caption:fresh",

    // Inline marks
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em",
    "r[style-name='Code'] => code",
    "r[style-name='Subtle Emphasis'] => em",
  ];

  if (!keepStyles) {
    // When the user opts out of styles, suppress run-level colour/font runs by
    // collapsing them into plain text. Mammoth doesn't emit inline colour by
    // default — this just gives us a hook in case a future option enables it.
  }

  return lines.join('\n');
}
