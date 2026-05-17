import { logger } from '../../utils/logger.js';
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
    if (this._db) {
      // Defensive: a previously-cached db connection may be missing our
      // object store (older build of the plugin opened it without one, or
      // an external tool deleted the store). Force a reopen so the upgrade
      // path runs and the store gets recreated.
      if (this._db.objectStoreNames.contains(IDB_STORE_NAME)) {
        return Promise.resolve(this._db);
      }
      try { this._db.close(); } catch (_) { /* noop */ }
      this._db = null;
      this._dbPromise = null;
    }
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = this._openIDBAt(IDB_DB_VERSION);
    return this._dbPromise;
  }

  // Open at a specific version. Kept separate so we can re-try at version+1
  // if we discover the existing database doesn't have our store.
  _openIDBAt(version) {
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(IDB_DB_NAME, version);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
          }
        };

        req.onsuccess = (e) => {
          const db = e.target.result;
          // The database might already exist at this version *without* our
          // object store — this happens when an older build of the plugin
          // (or a partially-failed upgrade) left the db in a broken state.
          // Detect it here and force a one-shot upgrade to the next
          // version, which re-runs onupgradeneeded and creates the store.
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            const nextVersion = db.version + 1;
            try { db.close(); } catch (_) { /* noop */ }
            this._db = null;
            this._dbPromise = null;
            this._openIDBAt(nextVersion).then(resolve, reject);
            return;
          }
          this._db = db;
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
  }

  async _idbGet(key) {
    try {
      const db = await this._openIDB();
      // Belt-and-braces: even after _openIDB's repair pass, the store
      // could theoretically still be absent (e.g. the db version was
      // already so high we can't repair). Bail to null so the localStorage
      // fallback in get() runs instead of throwing inside the executor.
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE_NAME, 'readonly');
          const req = tx.objectStore(IDB_STORE_NAME).get(key);
          req.onsuccess = () => resolve(req.result ? req.result.payload : null);
          req.onerror = (e) => {
            logger.warn('[DraftStorage] IDB read failed:', e.target && e.target.error);
            resolve(null);
          };
        } catch (err) {
          // Synchronous throws inside the executor would otherwise produce
          // an unhandled rejection that propagates out of _idbGet and
          // skips the localStorage fallback. Swallow into a null result.
          logger.warn('[DraftStorage] IDB read tx threw:', err && err.message);
          resolve(null);
        }
      });
    } catch (err) {
      logger.warn('[DraftStorage] IDB open failed during read:', err && err.message);
      return null;
    }
  }

  async _idbSet(key, payload) {
    try {
      const db = await this._openIDB();
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          const req = tx.objectStore(IDB_STORE_NAME).put({ id: key, payload });
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => {
            logger.warn('[DraftStorage] IDB write failed:', e.target && e.target.error);
            resolve(false);
          };
        } catch (err) {
          logger.warn('[DraftStorage] IDB write tx threw:', err && err.message);
          resolve(false);
        }
      });
    } catch (err) {
      logger.warn('[DraftStorage] IDB open failed during write:', err && err.message);
      return false;
    }
  }

  async _idbDelete(key) {
    try {
      const db = await this._openIDB();
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          const req = tx.objectStore(IDB_STORE_NAME).delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => {
            logger.warn('[DraftStorage] IDB delete failed:', e.target && e.target.error);
            resolve(false);
          };
        } catch (err) {
          logger.warn('[DraftStorage] IDB delete tx threw:', err && err.message);
          resolve(false);
        }
      });
    } catch (err) {
      logger.warn('[DraftStorage] IDB open failed during delete:', err && err.message);
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
      logger.warn('[DraftStorage] localStorage write failed:', err && err.name);
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
   *
   * Wrapping the IDB read in a try/catch is critical: while _idbGet is
   * supposed to swallow all errors and resolve to null, a malformed or
   * upgrading database can still produce sync throws or unhandled
   * rejections from inside Promise executors. If we let one of those
   * escape here, the await would re-throw, the localStorage fallback
   * would never run, and a perfectly-good draft already sitting in
   * localStorage would look "lost" to the recovery banner.
   * @param {string} key
   * @returns {Promise<Object|null>}
   */
  async get(key) {
    let idbValue = null;
    try {
      idbValue = await this._idbGet(key);
    } catch (err) {
      logger.warn('[DraftStorage] IDB read threw — falling back to localStorage:', err && err.message);
      idbValue = null;
    }
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
