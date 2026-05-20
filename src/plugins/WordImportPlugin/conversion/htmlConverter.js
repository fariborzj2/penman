// src/plugins/WordImportPlugin/conversion/htmlConverter.js
//
// Convert an HTML file (the literal text of an .html / .htm document) to a
// fragment of clean HTML suitable for insertion into the editor.
//
// The job here is intentionally narrow:
//   • Parse the raw string with the browser's own HTMLParser via DOMParser
//     so malformed markup is forgiven the same way browsers forgive it.
//   • Extract the <body> contents only. Anything in <head> (meta, scripts,
//     stylesheets, link tags) is discarded — the editor doesn't host
//     document-level chrome and external stylesheets could break the page.
//   • Strip elements that are unsafe or irrelevant inside an editor context
//     (script, style, link, meta, base, noscript). The editor's Sanitizer
//     runs later and would remove them anyway, but doing it here keeps the
//     converter output predictable and makes downstream cleaners simpler.
//   • Drop event-handler attributes (onclick, onload, …) so neither the
//     preview nor the saved document inherits live JS.
//
// Returns the same shape as docxConverter / rtfConverter so the calling
// modal can treat all three formats uniformly.

/**
 * Convert raw HTML source text to a cleaned HTML fragment.
 *
 * @param {string} htmlText  Raw contents of an .html file
 * @returns {{ html: string, messages: Array<{type: string, message: string}>, images: Array<object> }}
 */
export function convertHtmlToHtml(htmlText) {
  if (typeof htmlText !== 'string' || !htmlText.trim()) {
    return { html: '', messages: [], images: [] };
  }

  const messages = [];

  let doc;
  try {
    doc = new DOMParser().parseFromString(htmlText, 'text/html');
  } catch (err) {
    return {
      html: '',
      messages: [{ type: 'error', message: 'Failed to parse HTML: ' + (err && err.message) }],
      images: [],
    };
  }

  // <body> is always synthesised by DOMParser, even for fragments without
  // <html>/<body> tags — so we can safely take whatever lives inside it.
  const body = doc.body || doc.documentElement;
  if (!body) {
    return { html: '', messages, images: [] };
  }

  // Remove elements that have no business inside the editor's content area.
  // We do this on a clone so the caller's source string remains untouched
  // (DOMParser already gives us a fresh document, but being explicit makes
  // the contract obvious to future maintainers).
  const unsafeSelectors = 'script, style, link, meta, base, noscript, title';
  body.querySelectorAll(unsafeSelectors).forEach((el) => el.remove());

  // Strip inline event handlers and javascript: URLs. The editor's Sanitizer
  // also catches these, but doing it upfront means the converter output is
  // self-contained and safe to log / debug.
  stripUnsafeAttributes(body);

  return {
    html: body.innerHTML || '',
    messages,
    images: [],
  };
}

/**
 * Walk every element under `root` and remove attributes that could execute
 * JavaScript when the editor parses the fragment.
 */
function stripUnsafeAttributes(root) {
  const all = root.querySelectorAll('*');
  for (const el of all) {
    // Snapshot the attribute list first — removeAttribute mutates it.
    const attrs = Array.from(el.attributes || []);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const value = (attr.value || '').trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }
      // Block javascript: / vbscript: URLs in any URL-bearing attribute.
      if ((name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action' || name === 'formaction') &&
          (value.startsWith('javascript:') || value.startsWith('vbscript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  }
}
