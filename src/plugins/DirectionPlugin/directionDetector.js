/**
 * directionDetector.js
 * Detects the text direction of a string using configurable strategies.
 *
 * Supported strategies:
 *   - 'first-strong': Unicode BiDi first strong character
 *   - 'ratio':        RTL/LTR character ratio analysis
 */

// ── Unicode ranges ────────────────────────────────────────────────────────────

// RTL: Arabic, Persian, Hebrew, Thaana, Syriac, N'Ko, Samaritan, Mandaic
const RTL_RANGES = [
  [0x0590, 0x05FF], // Hebrew
  [0x0600, 0x06FF], // Arabic
  [0x0700, 0x074F], // Syriac
  [0x0750, 0x077F], // Arabic Supplement
  [0x07C0, 0x07FF], // N'Ko
  [0x0800, 0x083F], // Samaritan
  [0x0840, 0x085F], // Mandaic
  [0xFB1D, 0xFB4F], // Hebrew Presentation Forms
  [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
];

// LTR: Basic Latin letters (A-Z, a-z) + Extended Latin
const LTR_RANGES = [
  [0x0041, 0x005A], // A–Z
  [0x0061, 0x007A], // a–z
  [0x00C0, 0x024F], // Latin Extended
];

// Characters to skip during detection
const SKIP_CHARS = new Set([
  ' ', '\t', '\n', '\r',
  '.', ',', ':', ';', '!', '?',
  '(', ')', '[', ']', '{', '}',
  '"', "'", '`', '«', '»', '،', '؟',
  '/', '\\', '|', '-', '_', '+', '=',
  '<', '>', '@', '#', '$', '%', '^', '&', '*',
]);

const URL_PATTERN = /https?:\/\/\S+/g;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the code point is RTL.
 * @param {number} cp  Unicode code point
 */
function isRTL(cp) {
  for (const [lo, hi] of RTL_RANGES) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

/**
 * Returns true if the code point is strongly LTR.
 * @param {number} cp
 */
function isLTR(cp) {
  for (const [lo, hi] of LTR_RANGES) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

/**
 * Returns true if the character is a decimal digit.
 * @param {number} cp
 */
function isDigit(cp) {
  return cp >= 0x0030 && cp <= 0x0039; // 0–9
}

/**
 * Returns true if the character should be skipped (neutral).
 * @param {string} char
 */
function isSkippable(char) {
  if (SKIP_CHARS.has(char)) return true;
  const cp = char.codePointAt(0);
  if (isDigit(cp)) return true;
  return false;
}

/**
 * Remove URL patterns from text to prevent them influencing direction.
 * @param {string} text
 * @returns {string}
 */
function stripURLs(text) {
  return text.replace(URL_PATTERN, ' ');
}

// ── Strategy: First Strong Character ─────────────────────────────────────────

/**
 * Determines direction based on the first strong directional character.
 * @param {string} text
 * @param {string} fallback  Direction to use when no strong char found
 * @returns {'ltr'|'rtl'}
 */
export function detectByFirstStrong(text, fallback = 'ltr') {
  const cleaned = stripURLs(text);

  for (const char of cleaned) {
    if (isSkippable(char)) continue;

    const cp = char.codePointAt(0);

    if (isRTL(cp)) return 'rtl';
    if (isLTR(cp)) return 'ltr';
  }

  return fallback;
}

// ── Strategy: Ratio-Based ─────────────────────────────────────────────────────

/**
 * Determines direction based on the ratio of RTL vs LTR characters
 * within the first `sampleSize` non-neutral characters.
 *
 * @param {string} text
 * @param {Object} config
 * @param {number} config.sampleSize   Max characters to analyse (default 120)
 * @param {number} config.rtlThreshold RTL ratio above which → 'rtl' (default 0.3)
 * @param {string} config.fallback     Default when no strong chars found
 * @returns {'ltr'|'rtl'}
 */
export function detectByRatio(text, {
  sampleSize = 120,
  rtlThreshold = 0.3,
  fallback = 'ltr',
} = {}) {
  const cleaned = stripURLs(text);

  let rtlCount = 0;
  let ltrCount = 0;
  let analysed = 0;

  for (const char of cleaned) {
    if (analysed >= sampleSize) break;
    if (isSkippable(char)) continue;

    const cp = char.codePointAt(0);

    if (isRTL(cp)) { rtlCount++; analysed++; }
    else if (isLTR(cp)) { ltrCount++; analysed++; }
  }

  const total = rtlCount + ltrCount;
  if (total === 0) return fallback;

  return (rtlCount / total) >= rtlThreshold ? 'rtl' : 'ltr';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect the direction of a text string.
 *
 * @param {string} text
 * @param {Object} config
 * @param {'first-strong'|'ratio'} [config.strategy='first-strong']
 * @param {string}  [config.fallback='ltr']
 * @param {number}  [config.sampleSize=120]   (ratio strategy)
 * @param {number}  [config.rtlThreshold=0.3] (ratio strategy)
 * @returns {'ltr'|'rtl'}
 */
export function detectDirection(text, config = {}) {
  if (!text || typeof text !== 'string') return config.fallback || 'ltr';

  const strategy = config.strategy || 'first-strong';

  if (strategy === 'ratio') {
    return detectByRatio(text, config);
  }

  return detectByFirstStrong(text, config.fallback || 'ltr');
}
