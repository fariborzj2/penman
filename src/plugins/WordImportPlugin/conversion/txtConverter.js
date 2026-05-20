// src/plugins/WordImportPlugin/conversion/txtConverter.js
//
// Convert a plain-text file to HTML. Strategy:
//   • Normalise line endings (CRLF / CR → LF) so paragraph splitting works
//     regardless of the source platform.
//   • Strip the UTF-8 BOM if present — common in files exported from
//     Windows Notepad and would otherwise appear as a stray character at
//     the start of the first paragraph.
//   • Split on blank lines (two-or-more consecutive newlines) into
//     paragraphs. Single newlines inside a paragraph become <br>.
//   • Escape every character so the source text cannot be interpreted as
//     HTML — important because users sometimes drop source code or markup
//     into a .txt file and would be surprised to see it rendered.
//
// Returns the same shape as docxConverter / rtfConverter so the calling
// modal can treat all formats uniformly.

import { escapeHtml } from '../../../utils/html.js';

/**
 * Convert plain text to a sequence of <p>…</p> blocks.
 *
 * @param {string} text  Raw contents of a .txt file
 * @returns {{ html: string, messages: Array<{type: string, message: string}>, images: Array<object> }}
 */
export function convertTxtToHtml(text) {
  if (typeof text !== 'string' || !text.length) {
    return { html: '', messages: [], images: [] };
  }

  // Strip BOM and normalise newlines.
  let normalised = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  // Split into paragraphs at one-or-more blank lines.
  const paragraphs = normalised.split(/\n{2,}/);

  const htmlParts = [];
  for (const raw of paragraphs) {
    const trimmed = raw.replace(/^\n+|\n+$/g, '');
    if (!trimmed) continue;

    // Escape, then convert remaining single newlines to <br>.
    const escaped = escapeHtml(trimmed).replace(/\n/g, '<br>');
    htmlParts.push(`<p>${escaped}</p>`);
  }

  return {
    html: htmlParts.join('\n'),
    messages: [],
    images: [],
  };
}
