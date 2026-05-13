/**
 * Debug-gated logger.
 *
 * All non-test source code should use this logger instead of console.* so that
 * production embeds stay quiet by default. Consumers can enable diagnostics by
 * either:
 *   1. Setting `window.PENMAN_DEBUG = true` before initializing the editor, or
 *   2. Passing `debug: true` in the editor options, or
 *   3. Calling `setLoggerEnabled(true)` programmatically.
 *
 * Once enabled, warnings and errors print to the browser console as before.
 *
 * The logger never silences runtime errors that the host application is set up
 * to handle — it only suppresses verbose diagnostic output.
 */

let _enabled = (typeof globalThis !== 'undefined' && globalThis.PENMAN_DEBUG === true);

export function setLoggerEnabled(value) {
  _enabled = Boolean(value);
}

export function isLoggerEnabled() {
  return _enabled;
}

export const logger = {
  warn(...args) {
    if (_enabled && typeof console !== 'undefined' && console.warn) {
      console.warn(...args);
    }
  },
  error(...args) {
    if (_enabled && typeof console !== 'undefined' && console.error) {
      console.error(...args);
    }
  },
  info(...args) {
    if (_enabled && typeof console !== 'undefined' && console.info) {
      console.info(...args);
    }
  },
};
