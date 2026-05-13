/**
 * Cryptographically-secure unique ID generator for internal DOM identifiers
 * (table IDs, cell IDs, image IDs, etc.).
 *
 * Strategy:
 *  1. Prefer `crypto.randomUUID()` when the runtime exposes it (modern browsers
 *     and Node 14.17+ in secure contexts).
 *  2. Fall back to `crypto.getRandomValues()` for environments where
 *     `randomUUID` is unavailable but the Web Crypto API is.
 *  3. Last-resort fallback: `Math.random()`. Not collision-safe, but only
 *     reached in very old or restricted environments.
 *
 * The returned suffix is a 9-character lowercase alphanumeric string, matching
 * the historical format produced by `Math.random().toString(36).substr(2, 9)`
 * so downstream code (CSS selectors, serializers) continues to work unchanged.
 *
 * @param {string} [prefix=''] - Optional prefix prepended to the generated id.
 * @returns {string} A unique identifier, optionally prefixed.
 */
export function uniqueId(prefix = '') {
  let suffix;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // Use UUID v4 (32 hex chars) and take 9 chars for backwards-compatible
    // length. This gives ~36 bits of entropy — collision-resistant enough for
    // per-document DOM IDs.
    suffix = crypto.randomUUID().replace(/-/g, '').substring(0, 9);
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    suffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').substring(0, 9);
  } else {
    // Math.random fallback. Only hit in environments without the Web Crypto API.
    suffix = Math.random().toString(36).substring(2, 11).padEnd(9, '0');
  }

  return prefix + suffix;
}
