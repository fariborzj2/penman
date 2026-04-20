/**
 * DraftStorage
 * Storage adapter for the DraftPlugin.
 *
 * Routing strategy:
 *   - Content estimated > 900 KB → IndexedDB (async, large-capacity)
 *   - Smaller content OR IDB unavailable → localStorage (sync, 5 MB limit)
 *
 * Both stores are checked on every read so drafts written before a
 * size-change are still found. Deletes hit both stores unconditionally.
 *
 * Error policy: all methods swallow errors and return null / false rather
 * than throwing, so the plugin degrades gracefully without crashing the editor.
 */

const IDB_DB_NAME = 'penman_drafts';
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = 'drafts';
const IDB_SIZE_THRESHOLD_BYTES = 900 * 1024; // 900 KB

export class DraftStorage {
  constructor() {
    this._db = null;
    this._dbPromise = null;
  }

  // ─── Size helper ─────────────────────────────────────────────────────────

  _estimatedBytes(payload) {
    try {
      return new Blob([JSON.stringify(payload)]).size;
    } catch {
      return Infinity;
    }
  }

  _shouldUseIDB(payload) {
    return this._estimatedBytes(payload) > IDB_SIZE_THRESHOLD_BYTES;
  }

  // ─── IndexedDB layer ─────────────────────────────────────────────────────

  _openIDB() {
    if (this._db) return Promise.resolve(this._db);
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
          }
        };

        req.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(this._db);
        };

        req.onerror = (e) => {
          this._dbPromise = null;
          reject(new Error('IDB open failed: ' + (e.target.error || 'unknown')));
        };

        req.onblocked = () => {
          this._dbPromise = null;
          reject(new Error('IDB open blocked'));
        };
      } catch (err) {
        this._dbPromise = null;
        reject(err);
      }
    });

    return this._dbPromise;
  }

  async _idbGet(key) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const req = tx.objectStore(IDB_STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.payload : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async _idbSet(key, payload) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const req = tx.objectStore(IDB_STORE_NAME).put({ id: key, payload });
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async _idbDelete(key) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const req = tx.objectStore(IDB_STORE_NAME).delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // ─── localStorage layer ───────────────────────────────────────────────────

  _lsGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      // Corrupted entry — remove it silently and return null
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      return null;
    }
  }

  _lsSet(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (err) {
      // QuotaExceededError is the most common failure
      console.warn('[DraftStorage] localStorage write failed:', err && err.name);
      return false;
    }
  }

  _lsDelete(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Retrieve a stored draft. Checks IDB first, then localStorage.
   * @param {string} key
   * @returns {Promise<Object|null>}
   */
  async get(key) {
    const idbValue = await this._idbGet(key);
    if (idbValue !== null) return idbValue;
    return this._lsGet(key);
  }

  /**
   * Persist a draft payload. Routes to IDB for large payloads, falls back to
   * localStorage if IDB is unavailable or the write fails.
   * @param {string} key
   * @param {Object} payload
   * @returns {Promise<boolean>}
   */
  async set(key, payload) {
    if (this._shouldUseIDB(payload)) {
      const ok = await this._idbSet(key, payload);
      if (ok) return true;
      // IDB failed — fall through to localStorage
    }
    return this._lsSet(key, payload);
  }

  /**
   * Delete a draft from both stores.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    await this._idbDelete(key);
    this._lsDelete(key);
    return true;
  }
}
