// src/plugins/WordImportPlugin/conversion/htmlCleaner.js
//
// Post-process the HTML returned by docx/rtf converters before handing it
// to the editor. The editor's own Sanitizer runs after this, so the goals
// here are presentational rather than safety-related: make every block
// type look exactly like what the editor's own plugins emit so the floating
// toolbar, selection model, alignment system, etc. all just work.
//
// Word + Mammoth realistically only produce: headings, paragraphs, lists,
// tables, images, links, blockquotes, bold/italic. The remaining wrappers
// (video, iframe, code block) are defensive — they cover the case where
// some converter or Word add-in does emit one of those tags.
//
// Native shapes mirrored here:
//
//   ImagePlugin (figureRenderer.js):
//     <figure class="penman-image penman-align-center"
//             data-alignment="center" contenteditable="false">
//       <div class="penman-image-wrapper">
//         <img draggable="false" loading="lazy" decoding="async" …>
//       </div>
//       <figcaption class="penman-image-caption" contenteditable="true"
//                   data-placeholder="…"></figcaption>
//     </figure>
//
//   TablePlugin (INSERT_TABLE command):
//     <table data-table-id="t-…">
//       <thead><tr><th data-cell-id="c-…"><p>…</p></th>…</tr></thead>
//       <tbody><tr><td data-cell-id="c-…"><p>…</p></td>…</tr>…</tbody>
//     </table>
//
//   MediaPlugin (MediaRenderer.js):
//     <figure class="penman-media penman-media-block" contenteditable="false"
//             data-media-id="…" data-provider="direct" data-kind="video|audio"
//             data-src="…">
//       <div class="penman-media-wrapper">…<video|audio>…</div>
//     </figure>
//
//   EmbedPlugin (EmbedPlugin.js):
//     <figure class="penman-embed-block" contenteditable="false">
//       <div class="penman-embed-wrapper">…<iframe>…</div>
//     </figure>
//
//   CodeBlockPlugin (CodeBlockPlugin.js hydrate()):
//     <figure class="penman-codeblock-figure" data-kind="codeblock"
//             data-language="…" contenteditable="false" dir="ltr">
//       <pre class="penman-codeblock" dir="ltr">
//         <code class="code-block lang-…" data-language="…"
//               contenteditable="true" dir="ltr">…</code>
//       </pre>
//     </figure>

import { uniqueId } from '../../../utils/uniqueId.js';

const FIGURE_CLASS = 'penman-image';
const DEFAULT_ALIGNMENT = 'center';

/**
 * @param {string} html  Converter output
 * @param {object} [opts]
 * @param {object} [opts.editor]  Editor instance, used to resolve the caption
 *                                placeholder via i18n. Optional; falls back
 *                                to an empty placeholder when omitted.
 */
export function cleanImportedHtml(html, opts = {}) {
  if (!html) return '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const captionPlaceholder = resolveCaptionPlaceholder(opts.editor);

  promoteImagesToFigures(wrapper, captionPlaceholder);
  decorateTables(wrapper);
  promoteMediaToFigures(wrapper);
  promoteIframesToEmbeds(wrapper);
  promoteCodeBlocks(wrapper);
  removeEmptyParagraphs(wrapper);
  trimTrailingBreaks(wrapper);

  return wrapper.innerHTML;
}

// ─── Images → ImagePlugin figures ──────────────────────────────────────────

function promoteImagesToFigures(root, captionPlaceholder) {
  const imgs = Array.from(root.querySelectorAll('img'));
  for (const img of imgs) {
    // Skip if already inside a penman-image figure (e.g. user pasted a
    // pre-formatted figure block from the same editor).
    if (img.closest(`figure.${FIGURE_CLASS}`)) continue;

    // Build the wrapper structure the ImagePlugin's renderer produces.
    const alignment = DEFAULT_ALIGNMENT;
    const figure = document.createElement('figure');
    figure.className = `${FIGURE_CLASS} penman-align-${alignment}`;
    figure.setAttribute('data-alignment', alignment);
    figure.setAttribute('contenteditable', 'false');

    const wrap = document.createElement('div');
    wrap.className = 'penman-image-wrapper';

    // Apply the same image-element conventions the editor uses natively:
    // draggable=false stops the browser's default drag preview, lazy/async
    // are performance hints that survive every save/load round-trip
    // because they're on the sanitizer's allow-list.
    img.setAttribute('draggable', 'false');
    if (!img.hasAttribute('loading'))  img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');

    // Preserve any width/height the converter emitted — Word usually carries
    // the printed dimensions, which give a sensible default size in the
    // editor. Users can still resize via the floating toolbar after import.

    // Derive a friendly alt from the filename if Word didn't supply one.
    if (!img.hasAttribute('alt') || !img.getAttribute('alt')) {
      const derived = deriveAltFromSrc(img.getAttribute('src') || '');
      if (derived) img.setAttribute('alt', derived);
    }

    // Splice the figure into the image's previous slot.
    img.parentNode.insertBefore(figure, img);
    wrap.appendChild(img);
    figure.appendChild(wrap);

    const caption = document.createElement('figcaption');
    caption.className = 'penman-image-caption';
    caption.setAttribute('contenteditable', 'true');
    if (captionPlaceholder) {
      caption.setAttribute('data-placeholder', captionPlaceholder);
    }
    figure.appendChild(caption);
  }
}

function deriveAltFromSrc(src) {
  if (!src) return '';
  // For data URLs we have no meaningful name; let it stay empty.
  if (src.startsWith('data:')) return '';
  try {
    const last = src.split('?')[0].split('#')[0].split('/').pop();
    return decodeURIComponent(last || '');
  } catch (_) {
    return '';
  }
}

// ─── Tables → TablePlugin shape ───────────────────────────────────────────

function decorateTables(root) {
  const tables = Array.from(root.querySelectorAll('table'));
  for (const table of tables) {
    if (!table.getAttribute('data-table-id')) {
      table.setAttribute('data-table-id', uniqueId('t-'));
    }
    const cells = Array.from(table.querySelectorAll('td, th'));
    for (const cell of cells) {
      if (!cell.getAttribute('data-cell-id')) {
        cell.setAttribute('data-cell-id', uniqueId('c-'));
      }
      // The editor stores cell content as block elements (<p>) so its
      // selection logic doesn't have to special-case raw text. Wrap any
      // bare text/inline content in a paragraph.
      if (!cell.querySelector('p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table')) {
        const text = cell.innerHTML.trim();
        cell.innerHTML = `<p>${text || '<br>'}</p>`;
      }
    }
  }
}

// ─── Media (video / audio) → MediaPlugin figure ───────────────────────────

function promoteMediaToFigures(root) {
  const els = Array.from(root.querySelectorAll('video, audio'));
  for (const media of els) {
    if (media.closest('figure.penman-media-block')) continue;

    const kind = media.tagName.toLowerCase(); // 'video' or 'audio'
    const figure = document.createElement('figure');
    figure.className = 'penman-media penman-media-block';
    figure.setAttribute('contenteditable', 'false');
    figure.dataset.mediaId = uniqueId('media-');
    figure.dataset.provider = 'direct';
    figure.dataset.kind = kind;
    const src = media.getAttribute('src') || extractSourceUrl(media) || '';
    if (src) figure.dataset.src = src;
    if (kind === 'video' && media.getAttribute('poster')) {
      figure.dataset.poster = media.getAttribute('poster');
    }

    const wrap = document.createElement('div');
    wrap.className = 'penman-media-wrapper';
    wrap.style.position = 'relative';
    wrap.style.width = '100%';
    wrap.style.overflow = 'hidden';
    if (kind === 'video') {
      wrap.style.height = '0';
      wrap.style.paddingBottom = '56.25%';
    } else {
      wrap.style.height = '50px';
    }

    // Performance hint that survives the sanitizer for both <video> and
    // <audio> — fetches just enough bytes to know duration / dimensions.
    if (!media.hasAttribute('preload')) media.setAttribute('preload', 'metadata');
    if (!media.hasAttribute('controls')) media.setAttribute('controls', '');
    media.style.position = 'absolute';
    media.style.top = '0';
    media.style.left = '0';
    media.style.width = '100%';
    media.style.height = '100%';

    media.parentNode.insertBefore(figure, media);
    wrap.appendChild(media);
    figure.appendChild(wrap);
  }
}

function extractSourceUrl(mediaEl) {
  const src = mediaEl.querySelector('source[src]');
  return src ? src.getAttribute('src') : '';
}

// ─── iframes → EmbedPlugin figure ──────────────────────────────────────────

function promoteIframesToEmbeds(root) {
  const iframes = Array.from(root.querySelectorAll('iframe'));
  for (const iframe of iframes) {
    if (iframe.closest('figure.penman-embed-block')) continue;

    const figure = document.createElement('figure');
    figure.className = 'penman-embed-block';
    figure.setAttribute('contenteditable', 'false');

    const wrap = document.createElement('div');
    wrap.className = 'penman-embed-wrapper';
    wrap.style.position = 'relative';
    wrap.style.width = '100%';
    wrap.style.overflow = 'hidden';
    wrap.style.paddingBottom = '56.25%';

    // EmbedPlugin's lazy-loading hint and absolute positioning.
    if (!iframe.hasAttribute('loading')) iframe.setAttribute('loading', 'lazy');
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';

    iframe.parentNode.insertBefore(figure, iframe);
    wrap.appendChild(iframe);
    figure.appendChild(wrap);
  }
}

// ─── <pre><code> → CodeBlockPlugin shape ──────────────────────────────────

function promoteCodeBlocks(root) {
  // CodeBlockPlugin has a hydrate() pass that recognises any bare
  // pre.penman-codeblock and rebuilds the figure chrome around it on first
  // sight. We just have to make sure each <pre> carries that class and
  // that its <code> child has a language attribute. The plugin handles the
  // rest at load time.
  const pres = Array.from(root.querySelectorAll('pre'));
  for (const pre of pres) {
    if (pre.closest('figure.penman-codeblock-figure')) continue;

    if (!pre.classList.contains('penman-codeblock')) {
      pre.classList.add('penman-codeblock');
    }
    pre.setAttribute('dir', 'ltr');

    let code = pre.querySelector('code');
    if (!code) {
      code = document.createElement('code');
      while (pre.firstChild) code.appendChild(pre.firstChild);
      pre.appendChild(code);
    }
    const lang = inferLanguage(code) || 'plain';
    code.setAttribute('data-language', lang);
    code.setAttribute('dir', 'ltr');
    if (!/\blang-/.test(code.className || '')) {
      code.className = `code-block lang-${lang}`;
    }
  }
}

function inferLanguage(codeEl) {
  // Honour <code class="language-foo"> (used by both Mammoth's default
  // mapping and our MarkdownPlugin), then fall back to data-language.
  const className = (codeEl.className || '').toLowerCase();
  const m = /(?:^|\s)(?:language|lang)-([a-z0-9+#-]+)/.exec(className);
  if (m) return m[1];
  return (codeEl.getAttribute('data-language') || '').toLowerCase();
}

// ─── Whitespace cleanup ────────────────────────────────────────────────────

function removeEmptyParagraphs(root) {
  const ps = Array.from(root.querySelectorAll('p'));
  for (const p of ps) {
    // Leave paragraphs inside table cells alone — table cells need at least
    // an empty <p> for the cursor to land.
    if (p.closest('td, th')) continue;
    const text = (p.textContent || '').replace(/ /g, '').trim();
    const hasMedia = p.querySelector('img, video, iframe, br + *');
    if (!text && !hasMedia) p.remove();
  }
}

function trimTrailingBreaks(root) {
  const ps = Array.from(root.querySelectorAll('p'));
  for (const p of ps) {
    while (p.lastChild && p.lastChild.nodeType === 1 && p.lastChild.tagName === 'BR') {
      // Keep a single <br> if the paragraph is otherwise empty so the line
      // remains visible in the editor.
      if (!p.firstChild || p.firstChild === p.lastChild) break;
      p.removeChild(p.lastChild);
    }
  }
}

// ─── i18n helpers ─────────────────────────────────────────────────────────

function resolveCaptionPlaceholder(editor) {
  if (!editor || !editor.i18n || typeof editor.i18n.t !== 'function') return '';
  const key = 'plugins.image.captionPlaceholder';
  const val = editor.i18n.t(key);
  // I18nManager returns the key itself if no translation is registered —
  // skip that case so the placeholder doesn't show an internal lookup key.
  return val && val !== key ? val : '';
}
