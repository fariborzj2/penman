import en from './locales/en.js';
import fa from './locales/fa.js';
import { logger } from '../utils/logger.js';

// Pre-load available dictionaries (core/editor-level strings only).
// Plugin strings are registered at runtime via I18nManager#register().
const dictionaries = {
  en,
  fa
};

export class I18nManager {
  constructor(lang = 'en') {
    this.setLanguage(lang);
  }

  setLanguage(lang) {
    // Fallback to English if language is not supported
    if (!dictionaries[lang]) {
      logger.warn(`Penman i18n: Language '${lang}' is not supported. Falling back to 'en'.`);
      this.lang = 'en';
    } else {
      this.lang = lang;
    }

    this.dictionary = dictionaries[this.lang];
    this.fallbackDictionary = dictionaries['en'];
  }

  get dir() {
    return this.dictionary._dir || 'ltr';
  }

  /**
   * Register plugin translations under a namespace.
   * Strings are deep-merged into the live dictionaries so subsequent t() calls
   * resolve them like any other key.
   *
   * @param {string} namespace - Dot-path namespace, e.g. "plugins.link"
   * @param {object} perLang   - { fa: {...}, en: {...} }
   *
   * @example
   *   editor.i18n.register('plugins.link', {
   *     fa: { title: '...', insert: '...' },
   *     en: { title: '...', insert: '...' }
   *   });
   */
  register(namespace, perLang) {
    if (!namespace || typeof namespace !== 'string') {
      logger.warn('Penman i18n: register() requires a namespace string.');
      return;
    }
    if (!perLang || typeof perLang !== 'object') {
      logger.warn(`Penman i18n: register('${namespace}') requires a per-language object.`);
      return;
    }

    for (const lang of Object.keys(perLang)) {
      if (!dictionaries[lang]) {
        // Auto-create a dictionary slot for unknown languages. This lets a plugin
        // ship an extra language without first patching the core.
        dictionaries[lang] = {};
      }
      this._setByPath(dictionaries[lang], namespace, perLang[lang]);
    }

    // Refresh the active references in case the active language was just
    // populated for the first time.
    this.dictionary = dictionaries[this.lang];
    this.fallbackDictionary = dictionaries['en'];
  }

  /**
   * Translate a given key.
   * Key supports dot-notation, e.g. "plugins.image.insert"
   * @param {string} key
   * @param {object} replacements - optional variables to replace in the string like {error: 'xyz'}
   * @returns {string} The translated string or the fallback string
   */
  t(key, replacements = {}) {
    let result = this._resolveKey(this.dictionary, key);

    // Fallback to english if key doesn't exist in the selected dictionary
    if (result === undefined && this.lang !== 'en') {
      result = this._resolveKey(this.fallbackDictionary, key);
    }

    // If still undefined, just return the key itself as a last resort
    if (result === undefined) {
      return key;
    }

    // Replace placeholders if any
    if (typeof result === 'string' && Object.keys(replacements).length > 0) {
      Object.keys(replacements).forEach(k => {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), replacements[k]);
      });
    }

    return result;
  }

  _resolveKey(obj, path) {
    return path.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : undefined;
    }, obj);
  }

  /**
   * Deep-merge `value` into `obj` at the dot-path `path`. Existing keys are
   * preserved when not overwritten so multiple plugins can extend a shared
   * namespace without clobbering each other.
   */
  _setByPath(obj, path, value) {
    const parts = path.split('.');
    let cursor = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (cursor[key] === null || typeof cursor[key] !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    const leaf = parts[parts.length - 1];
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      cursor[leaf] !== null &&
      typeof cursor[leaf] === 'object' &&
      !Array.isArray(cursor[leaf])
    ) {
      // Deep-merge two plain objects.
      this._deepMerge(cursor[leaf], value);
    } else {
      cursor[leaf] = value;
    }
  }

  _deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      const sv = source[key];
      const tv = target[key];
      if (
        sv !== null &&
        typeof sv === 'object' &&
        !Array.isArray(sv) &&
        tv !== null &&
        typeof tv === 'object' &&
        !Array.isArray(tv)
      ) {
        this._deepMerge(tv, sv);
      } else {
        target[key] = sv;
      }
    }
  }
}
