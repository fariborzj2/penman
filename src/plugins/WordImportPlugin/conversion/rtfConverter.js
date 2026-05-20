// src/plugins/WordImportPlugin/conversion/rtfConverter.js
//
// Minimal RTF → HTML converter. RTF is a text-based, control-word-prefixed
// format — far simpler than .docx — so we handle the common subset in-tree
// without dragging in a parser dependency.
//
// Supported:
//   • Paragraphs (\par)
//   • Bold (\b / \b0), Italic (\i / \i0), Underline (\ul / \ulnone)
//   • Strikethrough (\strike / \strike0)
//   • Headings inferred from font-size shifts (\fsNN)
//   • Hyperlinks ({\field {\*\fldinst HYPERLINK "url"} {\fldrslt text}})
//   • Unicode characters (\uNNNN?)
//   • Hex-escaped bytes (\'XX) decoded with CP1252 by default
//   • Line breaks (\line)
//
// Unsupported (silently dropped or simplified):
//   • Tables (renders cells as paragraphs)
//   • Embedded images
//   • Complex nested groups
//
// The output passes through the editor's sanitizer like any other inserted
// HTML, so unsafe content can't escape into the document.

import { escapeHtml } from '../../../utils/html.js';

export function convertRtfToHtml(rtfString) {
  if (typeof rtfString !== 'string' || !rtfString.trim()) {
    return { html: '', messages: [], images: [] };
  }

  const parser = new RtfParser(rtfString);
  const html = parser.parse();
  return {
    html,
    messages: parser.warnings.map((w) => ({ type: 'warning', message: w })),
    images: [],
  };
}

// ─── Parser ─────────────────────────────────────────────────────────────────

class RtfParser {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.warnings = [];

    // Output buffer + paragraph state
    this.out = [];
    this.paragraphBuffer = '';
    this.openTags = []; // <strong>, <em>, etc. currently open inside paragraph

    // Inline formatting state (toggled by control words)
    this.state = this._freshState();
    this.stateStack = [];

    // Pending hyperlink target captured from \field instructions.
    this.pendingHyperlink = null;
  }

  _freshState() {
    return {
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      fontSize: null,        // in half-points (RTF \fsNN)
      inFieldInst: false,    // inside {\*\fldinst …}
      inFieldRslt: false,    // inside {\fldrslt …}
      skipGroup: false,      // {\*\…} ignorable destinations
      hyperlinkUrl: null,    // active hyperlink target
    };
  }

  parse() {
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];

      if (ch === '\\') {
        this._handleBackslash();
      } else if (ch === '{') {
        this.pos++;
        this.stateStack.push({ ...this.state });
      } else if (ch === '}') {
        this.pos++;
        // Closing a hyperlink result group → close the <a>
        if (this.state.hyperlinkUrl) this._closeHyperlinkIfNeeded();
        const prev = this.stateStack.pop();
        if (prev) this.state = prev;
      } else if (ch === '\n' || ch === '\r') {
        // Raw newlines in RTF are formatting only; ignore.
        this.pos++;
      } else {
        this._writeText(ch);
        this.pos++;
      }
    }
    this._flushParagraph();
    return this.out.join('\n');
  }

  _handleBackslash() {
    this.pos++; // consume the backslash
    if (this.pos >= this.input.length) return;
    const next = this.input[this.pos];

    // \' XX — hex byte escape
    if (next === "'") {
      this.pos++;
      const hex = this.input.substr(this.pos, 2);
      this.pos += 2;
      const code = parseInt(hex, 16);
      if (!isNaN(code)) {
        this._writeText(cp1252Decode(code));
      }
      return;
    }

    // \\ \{ \} — literal escapes
    if (next === '\\' || next === '{' || next === '}') {
      this.pos++;
      this._writeText(next);
      return;
    }

    // \* — marks an ignorable destination; the next control word's group is
    // dropped unless we explicitly understand it (e.g. \fldinst).
    if (next === '*') {
      this.pos++;
      return;
    }

    // \~ → non-breaking space; \- → optional hyphen; \_ → non-breaking hyphen
    if (next === '~') { this.pos++; this._writeText(' '); return; }
    if (next === '-') { this.pos++; return; }
    if (next === '_') { this.pos++; this._writeText('‑'); return; }

    // Control word: letters [+ optional numeric parameter] [+ optional space]
    const match = this.input.substr(this.pos).match(/^([a-zA-Z]+)(-?\d+)?\s?/);
    if (!match) {
      this.pos++;
      return;
    }
    const word = match[1];
    const param = match[2] != null ? parseInt(match[2], 10) : null;
    this.pos += match[0].length;
    this._applyControlWord(word, param);
  }

  _applyControlWord(word, param) {
    switch (word) {
      // Paragraph / line breaks
      case 'par':
        this._flushParagraph();
        break;
      case 'line':
        this.paragraphBuffer += '<br>';
        break;
      case 'tab':
        this._writeText('\t');
        break;

      // Inline formatting toggles
      case 'b':
        this._setMark('bold', param !== 0);
        break;
      case 'i':
        this._setMark('italic', param !== 0);
        break;
      case 'ul':
        this._setMark('underline', param !== 0);
        break;
      case 'ulnone':
        this._setMark('underline', false);
        break;
      case 'strike':
        this._setMark('strike', param !== 0);
        break;

      // Font size in half-points (e.g. \fs24 → 12pt)
      case 'fs':
        this.state.fontSize = param;
        break;

      // Unicode character: \uNNNN?  followed by a fallback char (we skip it)
      case 'u': {
        if (param != null) {
          let code = param;
          if (code < 0) code += 65536;
          this._writeText(String.fromCharCode(code));
          // Skip the substitution character that follows.
          if (this.input[this.pos] === ' ') this.pos++;
          if (this.pos < this.input.length && this.input[this.pos] !== '\\' && this.input[this.pos] !== '{' && this.input[this.pos] !== '}') {
            this.pos++;
          }
        }
        break;
      }

      // Hyperlink field instruction: \fldinst then a quoted URL
      case 'fldinst':
        this.state.inFieldInst = true;
        this._captureHyperlinkTarget();
        break;
      case 'fldrslt':
        this.state.inFieldRslt = true;
        if (this.pendingHyperlink) {
          this.state.hyperlinkUrl = this.pendingHyperlink;
          this.pendingHyperlink = null;
          this.paragraphBuffer += `<a href="${escapeHtml(this.state.hyperlinkUrl)}">`;
        }
        break;

      // Destinations we want to skip entirely.
      case 'pict':
      case 'object':
      case 'header':
      case 'footer':
      case 'footnote':
      case 'stylesheet':
      case 'colortbl':
      case 'fonttbl':
      case 'info':
        this._skipCurrentGroup();
        break;

      default:
        // Unknown control word — ignore. Most layout-related words have no
        // visible effect on plain HTML output.
        break;
    }
  }

  /**
   * Read ahead inside a \fldinst group for a HYPERLINK "url" pattern.
   * The group ends at the next unbalanced '}'. We don't consume bytes
   * permanently for the URL — only enough to extract it; the regular parse
   * loop continues from where we were.
   */
  _captureHyperlinkTarget() {
    const m = this.input.substr(this.pos).match(/HYPERLINK\s+"([^"]+)"/);
    if (m) {
      this.pendingHyperlink = m[1];
    }
  }

  _skipCurrentGroup() {
    // Walk forward, tracking nested braces, until we exit the current group.
    let depth = 1;
    while (this.pos < this.input.length && depth > 0) {
      const ch = this.input[this.pos++];
      if (ch === '\\' && (this.input[this.pos] === '{' || this.input[this.pos] === '}' || this.input[this.pos] === '\\')) {
        this.pos++;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    // Restore outer state.
    const prev = this.stateStack.pop();
    if (prev) this.state = prev;
  }

  _setMark(name, value) {
    if (this.state[name] === value) return;
    this._reflowOpenTags(() => { this.state[name] = value; });
  }

  /**
   * Inline marks (bold/italic/etc.) are emitted as HTML tags. RTF can toggle
   * them in any order so we close and re-open the affected tag chain to keep
   * the HTML well-nested.
   */
  _reflowOpenTags(mutateState) {
    // Close all currently open tags in reverse order
    while (this.openTags.length) {
      const t = this.openTags.pop();
      this.paragraphBuffer += `</${t}>`;
    }
    mutateState();
    // Re-open tags in the canonical order
    const desired = [];
    if (this.state.bold)      desired.push('strong');
    if (this.state.italic)    desired.push('em');
    if (this.state.underline) desired.push('u');
    if (this.state.strike)    desired.push('s');
    for (const t of desired) {
      this.paragraphBuffer += `<${t}>`;
      this.openTags.push(t);
    }
  }

  _closeHyperlinkIfNeeded() {
    if (!this.state.hyperlinkUrl) return;
    // Close any inline marks that are open, then </a>, then re-open marks.
    const stash = this.openTags.slice();
    while (this.openTags.length) {
      const t = this.openTags.pop();
      this.paragraphBuffer += `</${t}>`;
    }
    this.paragraphBuffer += `</a>`;
    this.state.hyperlinkUrl = null;
    for (const t of stash) {
      this.paragraphBuffer += `<${t}>`;
      this.openTags.push(t);
    }
  }

  _writeText(text) {
    if (this.state.skipGroup) return;
    // Skip text inside the \fldinst destination — it's the URL spec, not body.
    if (this.state.inFieldInst) return;
    this.paragraphBuffer += escapeHtml(text);
  }

  _flushParagraph() {
    // Close any open inline tags before emitting the paragraph.
    while (this.openTags.length) {
      const t = this.openTags.pop();
      this.paragraphBuffer += `</${t}>`;
    }
    if (this.state.hyperlinkUrl) {
      this.paragraphBuffer += `</a>`;
      this.state.hyperlinkUrl = null;
    }
    const text = this.paragraphBuffer.trim();
    if (text) {
      // Map font-size to a heading level if it looks like one. Word stores
      // sizes in half-points so 24 = 12pt (body), 28 = 14pt, 32 = 16pt, etc.
      // We only promote to a heading when the size is clearly larger than
      // standard body copy to avoid turning every paragraph into an <h3>.
      const fs = this.state.fontSize;
      let tag = 'p';
      if (fs != null) {
        if (fs >= 40)      tag = 'h1';
        else if (fs >= 32) tag = 'h2';
        else if (fs >= 28) tag = 'h3';
      }
      this.out.push(`<${tag}>${text}</${tag}>`);
    }
    this.paragraphBuffer = '';
  }
}

// CP1252 to Unicode — only the bytes outside ASCII that actually differ from
// ISO-8859-1 are listed; everything else is identity-mapped.
const CP1252_OVERRIDES = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

function cp1252Decode(byte) {
  if (CP1252_OVERRIDES[byte] != null) return String.fromCharCode(CP1252_OVERRIDES[byte]);
  return String.fromCharCode(byte);
}
