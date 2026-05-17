/**
 * Zero-dependency HTML tokenizer for the source-code view.
 *
 * Single-pass, position-based, error-tolerant: anything that doesn't parse
 * cleanly falls through as plain text so the editor never throws on
 * mid-edit / malformed input. Output is a flat array of
 * `{ type, value }` tokens that the renderer wraps in colored <span>s.
 *
 * Token types emitted:
 *   text          — plain text content (no class applied)
 *   tag-bracket   — `<`, `>`, `</`, `/>`
 *   tag-name      — the tag's name (`div`, `Foo-Bar`, etc.)
 *   attr-name     — attribute name
 *   attr-eq       — the `=` between name and value
 *   attr-value    — attribute value INCLUDING surrounding quotes
 *   comment       — `<!-- ... -->` (and CDATA, treated similarly)
 *   doctype       — `<!doctype ...>`
 *   entity        — `&amp;` / `&#39;` style entities
 *   script/style  — opaque body of script/style elements (sub-tokenized)
 *   js-comment / js-string  — inside <script>
 *   css-comment / css-string — inside <style>
 *
 * Note: the tokenizer does NOT try to be a real parser. It only needs to
 * emit a colorable token stream that survives unbalanced or partial input.
 */

/**
 * Tokenize an HTML source string.
 * @param {string} src
 * @returns {Array<{type: string, value: string}>}
 */
export function tokenizeHTML(src) {
  const tokens = [];
  if (!src) return tokens;
  const n = src.length;
  let i = 0;

  function push(type, start, end) {
    if (end > start) tokens.push({ type, value: src.slice(start, end) });
  }

  while (i < n) {
    const c = src[i];

    // ─── < … starting a markup construct ───────────────────────────────
    if (c === '<') {
      // <!-- comment -->
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        const close = end >= 0 ? end + 3 : n;
        push('comment', i, close);
        i = close;
        continue;
      }
      // <!DOCTYPE …>
      if (src.substr(i, 9).toLowerCase() === '<!doctype') {
        const end = src.indexOf('>', i);
        const close = end >= 0 ? end + 1 : n;
        push('doctype', i, close);
        i = close;
        continue;
      }
      // <![CDATA[ … ]]>  (rare in HTML, common in inline SVG)
      if (src.startsWith('<![CDATA[', i)) {
        const end = src.indexOf(']]>', i + 9);
        const close = end >= 0 ? end + 3 : n;
        push('comment', i, close);
        i = close;
        continue;
      }

      // Opening or closing tag: < /? tagname …
      const slice = src.slice(i, i + 200);
      const m = /^<(\/)?([a-zA-Z][a-zA-Z0-9\-:_]*)/.exec(slice);
      if (!m) {
        // Stray '<' — emit as text and advance one char
        push('text', i, i + 1);
        i += 1;
        continue;
      }

      const isClosing = !!m[1];
      const tagName = m[2];
      const bracketLen = isClosing ? 2 : 1;
      push('tag-bracket', i, i + bracketLen);
      push('tag-name', i + bracketLen, i + bracketLen + tagName.length);
      i += bracketLen + tagName.length;

      // Walk attributes until `>` or `/>` or EOF
      while (i < n) {
        const cc = src[i];

        // Whitespace inside tag — emit as text (preserves spacing)
        if (cc === ' ' || cc === '\t' || cc === '\n' || cc === '\r') {
          const start = i;
          while (i < n && /[ \t\n\r]/.test(src[i])) i++;
          push('text', start, i);
          continue;
        }

        // Tag close `>`
        if (cc === '>') {
          push('tag-bracket', i, i + 1);
          i++;
          break;
        }
        // Self-close `/>`
        if (cc === '/' && src[i + 1] === '>') {
          push('tag-bracket', i, i + 2);
          i += 2;
          break;
        }

        // Attribute name (anything up to whitespace, =, /, >)
        const am = /^[^\s/>=]+/.exec(src.slice(i));
        if (am) {
          push('attr-name', i, i + am[0].length);
          i += am[0].length;

          // Optional =value
          if (src[i] === '=') {
            push('attr-eq', i, i + 1);
            i++;

            const q = src[i];
            if (q === '"' || q === "'") {
              const start = i;
              i++;
              while (i < n && src[i] !== q) i++;
              if (i < n) i++; // consume closing quote
              push('attr-value', start, i);
            } else if (q !== undefined && !/[\s>]/.test(q)) {
              // Unquoted value
              const start = i;
              while (i < n && !/[\s>/]/.test(src[i])) i++;
              push('attr-value', start, i);
            }
          }
          continue;
        }

        // Unknown character inside tag — emit as text and move on
        push('text', i, i + 1);
        i++;
      }

      // After an opening <script>/<style>, the body is raw until the
      // matching close tag. We sub-tokenize it lightly for strings/comments
      // so the editor still looks alive.
      if (!isClosing) {
        const lower = tagName.toLowerCase();
        if (lower === 'script' || lower === 'style') {
          const closeRe = lower === 'script' ? /<\/script[\s>]/i : /<\/style[\s>]/i;
          const after = src.slice(i);
          const found = closeRe.exec(after);
          const end = found ? i + found.index : n;
          const body = src.slice(i, end);
          if (body.length > 0) {
            // Sub-tokenize the body so strings/comments get colored too.
            // We re-emit tokens with absolute offsets shifted by `i`.
            const sub = lower === 'script' ? subTokenizeJS(body) : subTokenizeCSS(body);
            for (const t of sub) tokens.push(t);
          }
          i = end;
        }
      }
      continue;
    }

    // ─── &entity; ───────────────────────────────────────────────────────
    if (c === '&') {
      const em = /^&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/.exec(src.slice(i, i + 16));
      if (em) {
        push('entity', i, i + em[0].length);
        i += em[0].length;
        continue;
      }
      // Lone &: fall through to text
    }

    // ─── Plain text — slurp until the next markup signal ────────────────
    const start = i;
    while (i < n && src[i] !== '<' && src[i] !== '&') i++;
    push('text', start, i);
  }

  return tokens;
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-tokenizers for <script> / <style> bodies. They're intentionally
// shallow — we don't need a JS parser, just enough to color strings,
// comments, keywords, and numbers so the body doesn't look like raw text.
// ─────────────────────────────────────────────────────────────────────────

const JS_KEYWORDS = new Set([
  'var','let','const','function','return','if','else','for','while','do',
  'switch','case','break','continue','new','delete','typeof','instanceof',
  'in','of','try','catch','finally','throw','class','extends','super',
  'this','import','export','from','as','default','async','await','yield',
  'true','false','null','undefined','void'
]);

function subTokenizeJS(src) {
  const out = [];
  const n = src.length;
  let i = 0;

  function push(type, start, end) {
    if (end > start) out.push({ type, value: src.slice(start, end) });
  }

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    // Line comment //…
    if (c === '/' && c2 === '/') {
      const end = src.indexOf('\n', i);
      const close = end < 0 ? n : end;
      push('js-comment', i, close);
      i = close;
      continue;
    }
    // Block comment /* … */
    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2);
      const close = end < 0 ? n : end + 2;
      push('js-comment', i, close);
      i = close;
      continue;
    }
    // Strings: " ' `
    if (c === '"' || c === "'" || c === '`') {
      const start = i;
      const quote = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        // template literal allows newlines; regular strings break at \n
        if (quote !== '`' && src[i] === '\n') break;
        i++;
      }
      push('js-string', start, i);
      continue;
    }
    // Numbers (cheap)
    if (c >= '0' && c <= '9') {
      const start = i;
      while (i < n && /[0-9a-fA-FxXoObB._eE+\-]/.test(src[i])) i++;
      push('js-number', start, i);
      continue;
    }
    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(c)) {
      const start = i;
      while (i < n && /[a-zA-Z0-9_$]/.test(src[i])) i++;
      const word = src.slice(start, i);
      push(JS_KEYWORDS.has(word) ? 'js-keyword' : 'script', start, i);
      continue;
    }
    // Everything else: punctuation/whitespace → plain
    const start = i;
    while (
      i < n
      && !/[\s\w'"`]/.test(src[i])
      && !(src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*'))
    ) i++;
    if (i === start) i++; // ensure progress for whitespace etc.
    push('script', start, i);
  }
  return out;
}

function subTokenizeCSS(src) {
  const out = [];
  const n = src.length;
  let i = 0;

  function push(type, start, end) {
    if (end > start) out.push({ type, value: src.slice(start, end) });
  }

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2);
      const close = end < 0 ? n : end + 2;
      push('css-comment', i, close);
      i = close;
      continue;
    }
    if (c === '"' || c === "'") {
      const start = i;
      const quote = c;
      i++;
      while (i < n && src[i] !== quote && src[i] !== '\n') {
        if (src[i] === '\\') { i += 2; continue; }
        i++;
      }
      if (src[i] === quote) i++;
      push('css-string', start, i);
      continue;
    }
    if (c === '#' || c === '.') {
      // Selectors / hex colors — let the renderer pick a flavor
      const start = i;
      i++;
      while (i < n && /[a-zA-Z0-9_\-]/.test(src[i])) i++;
      push('css-selector', start, i);
      continue;
    }
    // Property / keyword
    if (/[a-zA-Z\-]/.test(c)) {
      const start = i;
      while (i < n && /[a-zA-Z0-9\-]/.test(src[i])) i++;
      // Is this a property (followed by `:`) or a value/keyword?
      let j = i;
      while (j < n && /[ \t]/.test(src[j])) j++;
      push(src[j] === ':' ? 'css-prop' : 'style', start, i);
      continue;
    }
    if (c >= '0' && c <= '9') {
      const start = i;
      while (i < n && /[0-9a-fA-F.%]/.test(src[i])) i++;
      // include unit (px, em, %, …)
      while (i < n && /[a-zA-Z%]/.test(src[i])) i++;
      push('css-number', start, i);
      continue;
    }
    const start = i;
    i++;
    push('style', start, i);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Renderer: turn tokens into HTML for the <pre> overlay.
// Escapes <, >, & so a tag in the source doesn't render as actual markup.
// ─────────────────────────────────────────────────────────────────────────

const TOKEN_CLASS = {
  // Tag delimiters (`<`, `>`, `</`, `/>`) get their own class so they can
  // share the tag-name color — that's the convention in VS Code, Sublime,
  // CodeMirror's oneDark, etc. Using `tk-punct` here would blend them into
  // the regular text color, which reads as "broken" to most users.
  'tag-bracket': 'tk-bracket-tag',
  'tag-name':    'tk-tag',
  'attr-name':   'tk-attr',
  // Attribute `=` stays muted (foreground-ish) on purpose — it's not a
  // meaningful color anchor and a tinted `=` looks busy.
  'attr-eq':     'tk-punct',
  'attr-value':  'tk-string',
  'comment':     'tk-comment',
  'doctype':     'tk-doctype',
  'entity':      'tk-entity',
  'js-keyword':  'tk-keyword',
  'js-string':   'tk-string',
  'js-comment':  'tk-comment',
  'js-number':   'tk-number',
  'css-prop':    'tk-attr',
  'css-string':  'tk-string',
  'css-comment': 'tk-comment',
  'css-number':  'tk-number',
  'css-selector':'tk-tag',
  // 'text' / 'script' / 'style' → no class (default color)
};

/** Escape HTML for safe insertion into the <pre> overlay. */
function escapeHTML(s) {
  // No need to escape quotes — we never put untrusted text into attributes.
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch === 38) out += '&amp;';        // &
    else if (ch === 60) out += '&lt;';    // <
    else if (ch === 62) out += '&gt;';    // >
    else out += s[i];
  }
  return out;
}

/**
 * Render token stream as an HTML string for the <pre> overlay.
 * @param {Array<{type:string,value:string}>} tokens
 * @returns {string}
 */
export function renderTokens(tokens) {
  let html = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const cls = TOKEN_CLASS[t.type];
    const esc = escapeHTML(t.value);
    if (cls) html += '<span class="' + cls + '">' + esc + '</span>';
    else     html += esc;
  }
  // Ensure the overlay always has a trailing newline so the last line
  // renders even when content is empty or ends mid-line.
  if (!html.endsWith('\n')) html += '\n';
  return html;
}
