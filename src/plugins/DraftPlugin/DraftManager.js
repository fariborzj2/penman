import { logger } from '../../utils/logger.js';
/**
 * DraftManager
 * Business logic layer for draft persistence.
 *
 * Responsibilities:
 *   - Load a draft and enforce TTL expiry.
 *   - Save only when content has actually changed (diff guard).
 *   - Reject saves for empty / trivially short content.
 *   - Debounce save calls so they batch during rapid typing.
 *   - Provide a seedBaseContent() method to set the "last saved" baseline
 *     without performing a write (used when initialising from server content
 *     or from a restored draft).
 */

const STORAGE_KEY_PREFIX = 'penman:draft:';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_DEBOUNCE_DELAY_MS = 1000;
const MIN_SAVE_LENGTH = 10; // characters stripped of HTML tags

export class DraftManager {
  /**
   * @param {import('./DraftStorage').DraftStorage} storage
   * @param {string} documentId  Unique identifier for this document.
   * @param {Object} [options]
   * @param {number} [options.ttl]            TTL in ms (default 7 days).
   * @param {number} [options.debounceDelay]  Debounce delay in ms (default 750).
   */
  constructor(storage, documentId, { ttl = DEFAULT_TTL_MS, debounceDelay = DEFAULT_DEBOUNCE_DELAY_MS } = {}) {
    if (!documentId || typeof documentId !== 'string' || !documentId.trim()) {
      throw new Error('[DraftManager] documentId must be a non-empty string.');
    }

    this._storage = storage;
    this._documentId = documentId.trim();
    this._ttl = ttl;
    this._debounceDelay = debounceDelay;
    this._storageKey = `${STORAGE_KEY_PREFIX}${this._documentId}`;
    this._lastSavedContent = null;
    this._debounceTimer = null;
    this._destroyed = false;
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get storageKey() { return this._storageKey; }
  get documentId() { return this._documentId; }
  get debounceDelay() { return this._debounceDelay; }

  // ─── Core operations ──────────────────────────────────────────────────────

  /**
   * Load the current draft from storage.
   * Returns null if no draft exists, it has expired, or data is corrupted.
   * @returns {Promise<{content:string, title:string, lastSavedAt:number, documentId:string}|null>}
   */
  async load() {
    if (this._destroyed) return null;

    try {
      const data = await this._storage.get(this._storageKey);
      if (!data) return null;

      // Structural validation — treat corrupted records as absent
      if (!data || typeof data.content !== 'string') {
        await this._storage.delete(this._storageKey);
        return null;
      }

      // TTL check
      if (typeof data.lastSavedAt === 'number' && Date.now() - data.lastSavedAt > this._ttl) {
        await this._storage.delete(this._storageKey);
        return null;
      }

      return data;
    } catch (err) {
      logger.warn('[DraftManager] load failed:', err);
      return null;
    }
  }

  /**
   * Immediately save content to storage.
   * Guards: destroyed state, empty content, unchanged content.
   * @param {string} content  HTML string from editor.getContent().
   * @param {string} [title]  Optional document title.
   * @returns {Promise<boolean>}
   */
  async save(content, title = '') {
    if (this._destroyed) return false;

    // Empty or trivially short content guard — never overwrite a real draft
    // with an empty or initialising state
    if (!content || this._stripTags(content).length < MIN_SAVE_LENGTH) return false;

    // Diff guard — skip if nothing changed since last save
    if (this._lastSavedContent === content) return false;

    const payload = {
      content,
      title: typeof title === 'string' ? title.trim() : '',
      lastSavedAt: Date.now(),
      documentId: this._documentId,
    };

    try {
      const ok = await this._storage.set(this._storageKey, payload);
      if (ok) this._lastSavedContent = content;
      return ok;
    } catch (err) {
      logger.warn('[DraftManager] save failed:', err);
      return false;
    }
  }

  /**
   * Schedule a debounced save. Multiple calls within the debounce window
   * collapse into a single write — the most recent content wins.
   * @param {string} content
   * @param {string} [title]
   */
  scheduleSave(content, title = '') {
    if (this._destroyed) return;
    this._clearTimer();
    this._debounceTimer = setTimeout(async () => {
      this._debounceTimer = null;
      await this.save(content, title);
    }, this._debounceDelay);
  }

  /**
   * Cancel any pending debounced save and delete the stored draft.
   * @returns {Promise<boolean>}
   */
  async remove() {
    this._clearTimer();
    this._lastSavedContent = null;
    try {
      return await this._storage.delete(this._storageKey);
    } catch (err) {
      logger.warn('[DraftManager] remove failed:', err);
      return false;
    }
  }

  /**
   * Set the baseline content without writing to storage.
   * Use when loading from a server response or after restoring a draft so
   * the next identical change is not treated as "new".
   * @param {string} content
   */
  seedBaseContent(content) {
    this._lastSavedContent = typeof content === 'string' ? content : null;
  }

  /**
   * Cancel the pending debounce and mark the manager as unusable.
   * Call when the editor instance is destroyed.
   */
  destroy() {
    this._clearTimer();
    this._destroyed = true;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  _clearTimer() {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  _stripTags(html) {
    try {
      return html.replace(/<[^>]*>/g, '').trim();
    } catch {
      return '';
    }
  }
}
