// src/plugins/WordImportPlugin/conversion/mammothLoader.js
//
// Lazy-loader for the Mammoth.js library. We don't bundle Mammoth (~800KB) —
// instead we fetch it from a CDN on first use so the editor's main bundle
// stays small for users who never import Word documents.
//
// The loader is idempotent: calling it multiple times yields the same
// in-flight Promise, so concurrent calls don't trigger duplicate downloads.

const MAMMOTH_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

let _mammothPromise = null;

/**
 * Load Mammoth.js from CDN and resolve with the global `mammoth` object.
 *
 * @returns {Promise<object>} the Mammoth module
 */
export function loadMammoth() {
  if (typeof window !== 'undefined' && window.mammoth) {
    return Promise.resolve(window.mammoth);
  }
  if (_mammothPromise) return _mammothPromise;

  _mammothPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Mammoth can only be loaded in a browser environment'));
      return;
    }
    const script = document.createElement('script');
    script.src = MAMMOTH_CDN_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.mammoth) {
        resolve(window.mammoth);
      } else {
        reject(new Error('Mammoth script loaded but window.mammoth is undefined'));
      }
    };
    script.onerror = () => {
      _mammothPromise = null; // allow retry
      reject(new Error('Failed to load Mammoth from CDN'));
    };
    document.head.appendChild(script);
  });

  return _mammothPromise;
}
