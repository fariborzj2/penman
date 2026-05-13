import en from './locales/en.js';
import fa from './locales/fa.js';
import { logger } from '../utils/logger.js';

// Pre-load available dictionaries
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
}
