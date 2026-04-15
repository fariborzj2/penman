import { TrustLevel } from '../security/urlValidator.js';

/**
 * 3. GALLERY SYSTEM (STRICT CONTRACT)
 * 3.1 Gallery Source Contract
 *
 * Lifecycle State: REGISTERED -> READY -> ERROR | DISABLED
 *
 * Required Methods:
 * - list(cursor: string | null, limit: number) -> Promise<GalleryListResponse>
 * - get(id: string) -> Promise<ImageItem>
 * - auth?() -> Promise<AuthState>
 */

export const GalleryState = {
  REGISTERED: 'REGISTERED',
  READY: 'READY',
  ERROR: 'ERROR',
  DISABLED: 'DISABLED'
};

export class GallerySource {
  constructor(config) {
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('GallerySource requires a unique string ID.');
    }
    if (typeof config.list !== 'function') {
      throw new Error('GallerySource requires a list() method.');
    }
    if (typeof config.get !== 'function') {
      throw new Error('GallerySource requires a get() method.');
    }

    this.id = config.id;
    this.name = config.name || this.id;

    // Trust Immutability Rule: trustLevel is explicitly defined at PluginManager registration time.
    // It CANNOT be mutated at runtime.
    this._trustLevel = config.trustLevel === TrustLevel.TRUSTED ? TrustLevel.TRUSTED : TrustLevel.UNTRUSTED;

    this._listFn = config.list;
    this._getFn = config.get;
    this._authFn = config.auth;

    this.state = GalleryState.REGISTERED;
  }

  get trustLevel() {
    return this._trustLevel;
  }

  /**
   * Initialize the source. If auth is required, it must transition to READY upon successful auth.
   */
  async init() {
    try {
      if (typeof this._authFn === 'function') {
        const authState = await this._authFn();
        // Assuming true or successful object means authenticated
        if (authState) {
          this.state = GalleryState.READY;
        } else {
          this.state = GalleryState.ERROR;
          throw new Error('Gallery authentication failed');
        }
      } else {
        this.state = GalleryState.READY;
      }
    } catch (error) {
      this.state = GalleryState.ERROR;
      throw error;
    }
  }

  /**
   * Fetches a list of images.
   * @param {string|null} cursor
   * @param {number} limit
   */
  async list(cursor = null, limit = 20) {
    if (this.state !== GalleryState.READY) {
      throw new Error(`GallerySource ${this.id} is not in READY state.`);
    }

    const response = await this._listFn(cursor, limit);

    // Ensure all returned items inherit the strict trust level of this source
    if (response && Array.isArray(response.items)) {
      const normalizedItems = response.items.map(item => this._enforceSchema(item));
      response.items = this._sortItemsDescending(normalizedItems);
    }
    return response;
  }

  _sortItemsDescending(items) {
    const getSortKey = (item) => {
      const timestampFields = ['mtime', 'timestamp', 'uploadedAt', 'createdAt', 'updatedAt', 'date'];
      for (const field of timestampFields) {
        if (item[field] != null) {
          const value = item[field];
          if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
          }
          const parsed = Date.parse(value);
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
      }

      if (item.id != null && !Number.isNaN(Number(item.id))) {
        return Number(item.id);
      }

      return null;
    };

    const keyed = items.map(item => ({ item, key: getSortKey(item) }));
    const hasSortKey = keyed.some(({ key }) => key !== null);
    if (!hasSortKey) {
      return items;
    }

    return keyed
      .sort((a, b) => {
        if (a.key === null && b.key === null) return 0;
        if (a.key === null) return 1;
        if (b.key === null) return -1;
        return b.key - a.key;
      })
      .map(({ item }) => item);
  }

  /**
   * Fetches a specific image by ID.
   * @param {string} id
   */
  async get(id) {
    if (this.state !== GalleryState.READY) {
      throw new Error(`GallerySource ${this.id} is not in READY state.`);
    }

    const item = await this._getFn(id);
    return this._enforceSchema(item);
  }

  /**
   * Trust Immutability Rule:
   * An ImageItem inherits its source's trust. Trust CANNOT be mutated at runtime by API payloads.
   */
  _enforceSchema(item) {
    if (!item || !item.url) {
      throw new Error('Invalid Gallery Item format');
    }

    return {
      id: String(item.id || ''),
      url: String(item.url),
      thumbnailUrl: String(item.thumbnailUrl || item.url),
      title: item.title ? String(item.title) : null,
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      sourceId: this.id,
      trustLevel: this._trustLevel, // STRICT: Enforced from source definition, ignoring API payload
      mtime: item.mtime != null ? Number(item.mtime) : null,
      timestamp: item.timestamp != null ? item.timestamp : null,
      createdAt: item.createdAt != null ? item.createdAt : null,
      updatedAt: item.updatedAt != null ? item.updatedAt : null,
      uploadedAt: item.uploadedAt != null ? item.uploadedAt : null,
      date: item.date != null ? item.date : null
    };
  }
}
