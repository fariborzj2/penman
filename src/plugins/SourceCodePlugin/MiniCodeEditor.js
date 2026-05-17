/**
 * MiniCodeEditor — a zero-dependency, themeable HTML source editor.
 *
 * Architecture (the "textarea + highlight overlay" pattern):
 *
 *     ┌─ .pm-mce ─────────────────────────────────────────────────┐
 *     │ ┌─.pm-mce-gutter─┐ ┌─.pm-mce-pane (overflow:auto) ─────┐ │
 *     │ │ 1              │ │ <pre.pm-mce-pre>highlighted</pre> │ │
 *     │ │ 2  (sync'd)    │ │ <textarea.pm-mce-ta/> (overlay)   │ │
 *     │ │ 3              │ │                                   │ │
 *     │ └────────────────┘ └───────────────────────────────────┘ │
 *     └───────────────────────────────────────────────────────────┘
 *
 *   • Source of truth: the <textarea>. Always editable, native IME,
 *     native selection, native undo/redo. Its text color is transparent;
 *     only the caret is visible.
 *   • Display: the <pre> behind the textarea is filled with colored
 *     <span>s from the tokenizer. Both elements share font/padding/
 *     line-height so each character aligns pixel-perfect.
 *   • Scrolling: the <pre> sits in normal flow inside .pm-mce-pane
 *     (overflow:auto), so the pane scrolls naturally when content
 *     overflows. After each edit we resize the textarea to match the
 *     pre's intrinsic size so click-targets cover the full content.
 *   • Gutter: positioned outside the scrollable pane and translated
 *     via CSS transform on every pane scroll so it tracks vertical
 *     position without taking part in horizontal scroll.
 *
 * All text mutations go through document.execCommand('insertText') so
 * the native textarea undo stack stays coherent.
 */

import { tokenizeHTML, renderTokens } from './tokenize-html.js';

// HTML void elements — never auto-close these when user finishes a tag.
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Bracket pairs we auto-close and bracket-match.
const OPEN_FOR  = { '(': ')', '[': ']', '{': '}' };
const CLOSE_FOR = { ')': '(', ']': '[', '}': '{' };

export class MiniCodeEditor {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.parent     — where to mount
   * @param {string}  [opts.value='']      — initial source
   * @param {string}  [opts.height='400px']
   * @param {Function}[opts.onChange]      — fired with new value after edits
   */
  constructor({ parent, value = '', height = '400px', onChange = null } = {}) {
    this.value = value;
    this.onChange = onChange;
    this._search = { query: '', matches: [], activeIndex: -1, caseSensitive: false };
    this._bracketPair = null;     // [openPos, closePos] when matched
    this._lastLineCount = 0;
    this._destroyed = false;

    this._buildDom(height);
    if (parent) parent.appendChild(this.root);

    this._bindEvents();

    // Resolve the initial theme up-front so first paint is correctly
    // coloured (no flash of wrong theme). The host SourceCodePlugin will
    // keep us in sync via setTheme() on every themeChange event.
    this.setTheme('auto');

    // First paint
    this.ta.value = value;
    this._render();
  }

  /**
   * Apply a theme to this editor instance.
   * @param {'auto'|'light'|'dark'} theme — 'auto' resolves to the OS
   *   preference at the moment of the call (snapshot — not reactive).
   */
  setTheme(theme) {
    let resolved = theme === 'dark' || theme === 'light' ? theme : null;
    if (!resolved) {
      // For 'auto' (or anything we don't recognise), inspect the page's
      // own signals. Order: explicit data-theme on <html>, then OS pref.
      const docTheme = (typeof document !== 'undefined'
                        && document.documentElement.getAttribute('data-theme')) || '';
      if (docTheme === 'dark') resolved = 'dark';
      else if (docTheme === 'light') resolved = 'light';
      else if (typeof window !== 'undefined'
               && window.matchMedia
               && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        resolved = 'dark';
      } else {
        resolved = 'light';
      }
    }
    this.root.classList.remove('pm-mce-light', 'pm-mce-dark');
    this.root.classList.add(resolved === 'dark' ? 'pm-mce-dark' : 'pm-mce-light');
  }

  // ─── DOM construction ─────────────────────────────────────────────────
  _buildDom(height) {
    this.root = document.createElement('div');
    this.root.className = 'pm-mce';
    if (height) this.root.style.height = height;
    this.root.setAttribute('dir', 'ltr');

    this.gutter = document.createElement('div');
    this.gutter.className = 'pm-mce-gutter';
    this.gutter.setAttribute('aria-hidden', 'true');
    this.gutterInner = document.createElement('div');
    this.gutterInner.className = 'pm-mce-gutter-inner';
    this.gutter.appendChild(this.gutterInner);

    this.pane = document.createElement('div');
    this.pane.className = 'pm-mce-pane';

    this.pre = document.createElement('pre');
    this.pre.className = 'pm-mce-pre';
    this.pre.setAttribute('aria-hidden', 'true');

    this.ta = document.createElement('textarea');
    this.ta.className = 'pm-mce-ta';
    this.ta.spellcheck = false;
    this.ta.dir = 'ltr';
    // Discourage browsers/extensions from interfering with code editing.
    this.ta.setAttribute('autocomplete', 'off');
    this.ta.setAttribute('autocorrect', 'off');
    this.ta.setAttribute('autocapitalize', 'off');
    this.ta.setAttribute('data-gramm', 'false');
    this.ta.setAttribute('data-gramm_editor', 'false');
    this.ta.setAttribute('data-enable-grammarly', 'false');
    this.ta.setAttribute('wrap', 'off');

    this.pane.appendChild(this.pre);
    this.pane.appendChild(this.ta);
    this.root.appendChild(this.gutter);
    this.root.appendChild(this.pane);
  }

  _bindEvents() {
    // Edits: re-render the highlight overlay.
    this.ta.addEventListener('input', () => {
      this.value = this.ta.value;
      this._render();
      if (this.onChange) this.onChange(this.value);
    });

    // Caret position changed → update active line + bracket match.
    const onSelect = () => this._updateCaretDecorations();
    this.ta.addEventListener('keyup', onSelect);
    this.ta.addEventListener('click', onSelect);
    this.ta.addEventListener('select', onSelect);

    this.ta.addEventListener('focus', () => {
      this.root.classList.add('pm-mce-focused');
      this._updateCaretDecorations();
    });
    this.ta.addEventListener('blur', () => {
      this.root.classList.remove('pm-mce-focused');
    });

    // Sync gutter scroll to pane scroll.
    this.pane.addEventListener('scroll', () => {
      // translateY is cheaper than scrollTop on the gutter (no reflow).
      this.gutterInner.style.transform = `translateY(${-this.pane.scrollTop}px)`;
    }, { passive: true });

    // Keyboard handlers for pro behaviors.
    this.ta.addEventListener('keydown', (e) => this._handleKey(e));

    // Window resize → re-measure overlay size (font metrics may shift).
    this._onResize = () => this._syncSize();
    window.addEventListener('resize', this._onResize);
  }

  // ─── Public API ───────────────────────────────────────────────────────

  /** Get the current source text. */
  getValue() { return this.ta.value; }

  /** Replace the source text wholesale. Resets undo history. */
  setValue(v) {
    this.value = v || '';
    this.ta.value = this.value;
    this._render();
  }

  /** Focus the editor. */
  focus() { this.ta.focus(); }

  /** Tear down: removes DOM + listeners. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    window.removeEventListener('resize', this._onResize);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  /**
   * Set the search query. Recomputes match positions and re-renders so
   * matches are highlighted. Pass empty string to clear.
   */
  setSearch(query, { caseSensitive = false } = {}) {
    this._search.query = query || '';
    this._search.caseSensitive = !!caseSensitive;
    this._search.matches = this._computeMatches();
    if (this._search.matches.length === 0) {
      this._search.activeIndex = -1;
    } else if (this._search.activeIndex < 0
               || this._search.activeIndex >= this._search.matches.length) {
      this._search.activeIndex = 0;
    }
    this._render();
  }

  /** Move to the next search match and scroll it into view. */
  findNext() { this._step(+1); }

  /** Move to the previous search match. */
  findPrev() { this._step(-1); }

  /** Replace the currently active match with `replacement`. Returns true if replaced. */
  replace(replacement) {
    if (this._search.activeIndex < 0) return false;
    const m = this._search.matches[this._search.activeIndex];
    if (!m) return false;
    this.ta.focus();
    this.ta.setSelectionRange(m.from, m.to);
    document.execCommand('insertText', false, replacement);
    // Recompute matches against the new text.
    this._search.matches = this._computeMatches();
    if (this._search.activeIndex >= this._search.matches.length) {
      this._search.activeIndex = this._search.matches.length - 1;
    }
    this._render();
    return true;
  }

  /** Replace every match with `replacement`. Returns the number replaced. */
  replaceAll(replacement) {
    if (!this._search.query || this._search.matches.length === 0) return 0;
    const count = this._search.matches.length;
    // Build the new value in one shot for a single undo step.
    const src = this.ta.value;
    let out = '';
    let cursor = 0;
    for (const m of this._search.matches) {
      out += src.substring(cursor, m.from) + replacement;
      cursor = m.to;
    }
    out += src.substring(cursor);
    this.ta.focus();
    this.ta.select();
    document.execCommand('insertText', false, out);
    this._search.matches = this._computeMatches();
    this._search.activeIndex = -1;
    this._render();
    return count;
  }

  // ─── Rendering ────────────────────────────────────────────────────────

  _render() {
    // 1) Tokenize the source.
    const tokens = tokenizeHTML(this.value);

    // 2) Collect decorations (search highlight + bracket match) keyed by
    //    absolute character position. The renderer splits tokens at
    //    decorated positions and adds the extra class.
    const deco = new Map();
    if (this._search.matches.length) {
      for (let i = 0; i < this._search.matches.length; i++) {
        const m = this._search.matches[i];
        const cls = i === this._search.activeIndex
          ? 'tk-search tk-search-active' : 'tk-search';
        for (let p = m.from; p < m.to; p++) deco.set(p, cls);
      }
    }
    if (this._bracketPair) {
      deco.set(this._bracketPair[0], (deco.get(this._bracketPair[0]) || '') + ' tk-bracket');
      deco.set(this._bracketPair[1], (deco.get(this._bracketPair[1]) || '') + ' tk-bracket');
    }

    // 3) Render to HTML and inject.
    this.pre.innerHTML = deco.size > 0
      ? renderWithDecorations(tokens, deco)
      : renderTokens(tokens);

    // 4) Gutter.
    this._renderGutter();

    // 5) Make textarea match pre's intrinsic size (so clicks anywhere
    //    in the content land on the textarea, even past viewport).
    this._syncSize();
  }

  _renderGutter() {
    const lines = countLines(this.value);
    if (this._lastLineCount === lines) {
      this._updateActiveLineClass();
      return;
    }
    this._lastLineCount = lines;
    let html = '';
    for (let i = 1; i <= lines; i++) {
      html += '<div class="pm-mce-ln">' + i + '</div>';
    }
    this.gutterInner.innerHTML = html;
    this._updateActiveLineClass();
  }

  _syncSize() {
    // Defer to the next frame so layout has settled (innerHTML changes
    // don't always synchronously update offsetWidth/Height).
    if (this._sizeRaf) cancelAnimationFrame(this._sizeRaf);
    this._sizeRaf = requestAnimationFrame(() => {
      this._sizeRaf = 0;
      const w = this.pre.offsetWidth;
      const h = this.pre.offsetHeight;
      this.ta.style.width  = w + 'px';
      this.ta.style.height = h + 'px';
    });
  }

  _updateCaretDecorations() {
    // Update active line in gutter
    this._updateActiveLineClass();

    // Update bracket match
    const oldPair = this._bracketPair;
    this._bracketPair = findBracketMatch(this.ta.value, this.ta.selectionStart);
    const changed = !pairsEqual(oldPair, this._bracketPair);
    if (changed) this._render();
  }

  _updateActiveLineClass() {
    const sel = this.ta.selectionStart;
    const before = this.ta.value.substring(0, sel);
    let lineIdx = 0;
    for (let i = 0; i < before.length; i++) if (before.charCodeAt(i) === 10) lineIdx++;
    if (this._activeLine === lineIdx) return;

    const prev = this.gutterInner.querySelector('.pm-mce-ln-active');
    if (prev) prev.classList.remove('pm-mce-ln-active');
    const next = this.gutterInner.children[lineIdx];
    if (next) next.classList.add('pm-mce-ln-active');
    this._activeLine = lineIdx;
  }

  // ─── Keyboard behaviors ───────────────────────────────────────────────

  _handleKey(e) {
    // Ctrl/Cmd-handled shortcuts are left to the host (modal) — we don't
    // hijack F/H here so the modal's search bar stays authoritative.
    if (e.key === 'Tab') {
      e.preventDefault();
      this._handleTab(e.shiftKey);
      return;
    }
    if (e.key === 'Enter') {
      // Let the textarea handle Enter natively, but inject auto-indent
      // BEFORE the newline lands so the resulting line is pre-indented.
      e.preventDefault();
      this._handleEnter();
      return;
    }
    // Auto-close brackets / quotes.
    if (this._isOpenPair(e.key)) {
      const close = OPEN_FOR[e.key] || e.key;
      // For quotes, only auto-close on collapsed selection
      const collapsed = this.ta.selectionStart === this.ta.selectionEnd;
      if (collapsed) {
        // If the next character is the same closing char already, skip
        const next = this.ta.value[this.ta.selectionStart];
        if (next === close && (e.key === '"' || e.key === "'")) {
          e.preventDefault();
          this.ta.selectionStart = this.ta.selectionEnd = this.ta.selectionStart + 1;
          return;
        }
        e.preventDefault();
        this._insert(e.key + close, 1);
        return;
      }
    }
    // Auto-close HTML tags: typing `>` after a complete `<tagname …>`.
    if (e.key === '>' && this.ta.selectionStart === this.ta.selectionEnd) {
      const pos = this.ta.selectionStart;
      const before = this.ta.value.substring(Math.max(0, pos - 200), pos);
      const m = /<([a-zA-Z][a-zA-Z0-9\-]*)((?:\s+[^<>]*)?)$/.exec(before);
      if (m && !m[2].trimEnd().endsWith('/')) {
        const tag = m[1].toLowerCase();
        if (!VOID_TAGS.has(tag)) {
          e.preventDefault();
          this._insert('></' + m[1] + '>', 1); // caret lands right after `>`
          return;
        }
      }
    }
    // Skip over closing char if user types it while next char is already
    // the matching close (e.g. typing `)` when caret sits before a `)`).
    if (CLOSE_FOR[e.key]
        && this.ta.selectionStart === this.ta.selectionEnd
        && this.ta.value[this.ta.selectionStart] === e.key) {
      e.preventDefault();
      this.ta.selectionStart = this.ta.selectionEnd = this.ta.selectionStart + 1;
    }
  }

  _handleEnter() {
    const ta = this.ta;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;

    // Indent of current line
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineToCaret = text.substring(lineStart, start);
    const baseIndent = (lineToCaret.match(/^[ \t]*/) || [''])[0];

    // Char immediately before caret and right after caret — used to detect
    // "Enter pressed inside an empty brace pair" so we open a fresh line:
    //   foo({|}) ⏎  →  foo({
    //                    █
    //                  })
    const beforeChar = start > 0 ? text[start - 1] : '';
    const afterChar  = end   < text.length ? text[end] : '';

    // Add a level if the char before caret opens a block.
    let extra = '';
    if (beforeChar === '>' || beforeChar === '{' || beforeChar === '[' || beforeChar === '(') {
      extra = '  ';
    }

    // Special-case: caret between matching open/close pair → split.
    const isPair = (beforeChar === '{' && afterChar === '}')
                || (beforeChar === '[' && afterChar === ']')
                || (beforeChar === '(' && afterChar === ')')
                || (beforeChar === '>' && afterChar === '<'); // between HTML open/close

    if (isPair) {
      this._insert('\n' + baseIndent + '  \n' + baseIndent, 1 + baseIndent.length + 2);
    } else {
      this._insert('\n' + baseIndent + extra);
    }
  }

  _handleTab(shift) {
    const ta = this.ta;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;

    // No selection, no Shift → just insert two spaces at caret.
    if (!shift && start === end) {
      this._insert('  ');
      return;
    }

    // With selection or Shift: indent/outdent each line in the range.
    const blockStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end);
    const blockEnd = lineEnd < 0 ? text.length : lineEnd;
    const block = text.substring(blockStart, blockEnd);
    const lines = block.split('\n');

    let firstDelta = 0;
    let totalDelta = 0;
    const modified = lines.map((line, idx) => {
      if (shift) {
        const m = line.match(/^( {1,2}|\t)/);
        if (m) {
          const d = m[0].length;
          if (idx === 0) firstDelta = -d;
          totalDelta -= d;
          return line.substring(d);
        }
        return line;
      } else {
        if (idx === 0) firstDelta = 2;
        totalDelta += 2;
        return '  ' + line;
      }
    }).join('\n');

    // Replace the block as one execCommand call so it's a single undo step.
    ta.setSelectionRange(blockStart, blockEnd);
    document.execCommand('insertText', false, modified);

    // Restore a sensible selection: shift caret in the first line by
    // firstDelta, expand end by totalDelta.
    const newStart = Math.max(blockStart, start + firstDelta);
    const newEnd   = Math.max(newStart, end + totalDelta);
    ta.setSelectionRange(newStart, newEnd);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  _isOpenPair(key) {
    return key === '(' || key === '[' || key === '{' || key === '"' || key === "'";
  }

  /**
   * Insert `text` at the caret using execCommand so native undo works.
   * If `caretBack` is provided, place the caret that many chars BEFORE
   * the end of the inserted text.
   */
  _insert(text, caretFromInsertStart = null) {
    const ta = this.ta;
    if (!document.execCommand) {
      // Fallback path (modern browsers all still support execCommand on
      // textareas; this branch is a safety net for unusual environments).
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.value = ta.value.substring(0, s) + text + ta.value.substring(e);
      const pos = caretFromInsertStart === null
        ? s + text.length
        : s + caretFromInsertStart;
      ta.setSelectionRange(pos, pos);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const insertStart = ta.selectionStart;
    document.execCommand('insertText', false, text);
    if (caretFromInsertStart !== null) {
      const pos = insertStart + caretFromInsertStart;
      ta.setSelectionRange(pos, pos);
    }
  }

  _computeMatches() {
    const q = this._search.query;
    if (!q) return [];
    const text = this.ta.value;
    const matches = [];
    const cs = this._search.caseSensitive;
    const needle = cs ? q : q.toLowerCase();
    const hay = cs ? text : text.toLowerCase();
    let from = 0;
    while (from <= hay.length - needle.length) {
      const idx = hay.indexOf(needle, from);
      if (idx < 0) break;
      matches.push({ from: idx, to: idx + needle.length });
      from = idx + needle.length;
    }
    return matches;
  }

  _step(dir) {
    if (this._search.matches.length === 0) return;
    let i = this._search.activeIndex;
    if (i < 0) {
      // Start from the match nearest the caret in the requested direction.
      const sel = this.ta.selectionStart;
      if (dir > 0) {
        i = this._search.matches.findIndex(m => m.from >= sel);
        if (i < 0) i = 0;
      } else {
        for (let k = this._search.matches.length - 1; k >= 0; k--) {
          if (this._search.matches[k].from < sel) { i = k; break; }
        }
        if (i < 0) i = this._search.matches.length - 1;
      }
    } else {
      i = (i + dir + this._search.matches.length) % this._search.matches.length;
    }
    this._search.activeIndex = i;
    const m = this._search.matches[i];
    // Move caret to match and scroll into view.
    this.ta.focus();
    this.ta.setSelectionRange(m.from, m.to);
    this._scrollMatchIntoView(m);
    this._render();
  }

  _scrollMatchIntoView(m) {
    // Find the line number for `m.from` and scroll the pane vertically.
    const before = this.ta.value.substring(0, m.from);
    let line = 0;
    for (let i = 0; i < before.length; i++) if (before.charCodeAt(i) === 10) line++;
    const lineHeight = this._approxLineHeight();
    const y = line * lineHeight;
    const padTop = parseFloat(getComputedStyle(this.pre).paddingTop) || 0;
    // Keep the match in the middle third of the viewport when possible.
    const targetTop = y + padTop - this.pane.clientHeight / 3;
    this.pane.scrollTop = Math.max(0, targetTop);
  }

  _approxLineHeight() {
    if (this._lineHeight) return this._lineHeight;
    const lh = parseFloat(getComputedStyle(this.pre).lineHeight);
    const fs = parseFloat(getComputedStyle(this.pre).fontSize);
    this._lineHeight = isFinite(lh) ? lh : (fs * 1.55);
    return this._lineHeight;
  }
}

// ─── Free helpers ───────────────────────────────────────────────────────

function countLines(s) {
  if (!s) return 1;
  let n = 1;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

function pairsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Naive bracket matcher: scans linearly to find the partner of the bracket
 * at (or just before) the caret. Doesn't skip brackets inside strings —
 * for an HTML source editor that's a worthwhile trade for simplicity.
 */
function findBracketMatch(text, caret) {
  // Probe two positions: char at caret, and char before caret. Whichever
  // is a bracket wins; ties go to "after-caret" (matches VS Code feel).
  const candidates = [
    { pos: caret, ch: text[caret] },
    { pos: caret - 1, ch: text[caret - 1] }
  ];
  for (const { pos, ch } of candidates) {
    if (pos < 0 || pos >= text.length) continue;
    if (OPEN_FOR[ch]) {
      const close = OPEN_FOR[ch];
      let depth = 1;
      for (let i = pos + 1; i < text.length; i++) {
        if (text[i] === ch) depth++;
        else if (text[i] === close) {
          depth--;
          if (depth === 0) return [pos, i];
        }
      }
    }
    if (CLOSE_FOR[ch]) {
      const open = CLOSE_FOR[ch];
      let depth = 1;
      for (let i = pos - 1; i >= 0; i--) {
        if (text[i] === ch) depth++;
        else if (text[i] === open) {
          depth--;
          if (depth === 0) return [i, pos];
        }
      }
    }
  }
  return null;
}

/**
 * Like renderTokens, but allows extra CSS classes attached to specific
 * character positions in the source. Used for search highlights and
 * bracket-pair highlights.
 *
 * @param {Array<{type:string,value:string}>} tokens
 * @param {Map<number,string>} deco — sourcePos → extra class names
 */
function renderWithDecorations(tokens, deco) {
  const TOKEN_CLASS = renderTokens.__TOKEN_CLASS_FALLBACK__;
  // Render token-by-token, splitting each token's text at decorated chars.
  let html = '';
  let pos = 0;

  for (const t of tokens) {
    const baseCls = TOKEN_FOR_TYPE[t.type] || '';
    let j = 0;
    while (j < t.value.length) {
      // Find next decorated index inside this token's slice.
      let k = j;
      while (k < t.value.length && !deco.has(pos + k)) k++;
      // Emit [j..k) unchanged.
      if (k > j) {
        const seg = escapeHTML(t.value.slice(j, k));
        html += baseCls ? `<span class="${baseCls}">${seg}</span>` : seg;
      }
      if (k < t.value.length) {
        // Decorated single char.
        const extra = deco.get(pos + k);
        const ch = escapeHTML(t.value[k]);
        const classes = baseCls ? `${baseCls} ${extra}` : extra;
        html += `<span class="${classes}">${ch}</span>`;
        j = k + 1;
      } else {
        j = k;
      }
    }
    pos += t.value.length;
  }
  if (!html.endsWith('\n')) html += '\n';
  return html;
}

// Mirror of the token-class table that tokenize-html.js uses for its plain
// renderer. Kept local so MiniCodeEditor can do decoration-aware rendering
// without exposing tokenize-html.js internals.
const TOKEN_FOR_TYPE = {
  // Mirror of tokenize-html.js's TOKEN_CLASS — keep these two in sync.
  'tag-bracket': 'tk-bracket-tag',
  'tag-name':    'tk-tag',
  'attr-name':   'tk-attr',
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
  'css-selector':'tk-tag'
};

function escapeHTML(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch === 38) out += '&amp;';
    else if (ch === 60) out += '&lt;';
    else if (ch === 62) out += '&gt;';
    else out += s[i];
  }
  return out;
}
