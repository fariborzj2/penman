import { GallerySource } from './GallerySource.js';

/**
 * Manages the registry of multiple external Image Gallery Sources.
 */
export class GallerySystem {
  constructor() {
    this._sources = new Map();
  }

  /**
   * Registers a new gallery source.
   * @param {Object} config - The source contract configuration.
   */
  registerSource(config) {
    if (this._sources.has(config.id)) {
      throw new Error('GALLERY_ALREADY_REGISTERED');
    }

    const source = new GallerySource(config);
    this._sources.set(source.id, source);
    return source;
  }

  /**
   * Retrieves an initialized gallery source.
   * @param {string} id
   */
  async getSource(id) {
    const source = this._sources.get(id);
    if (!source) {
      throw new Error('GALLERY_NOT_FOUND');
    }

    if (source.state === 'REGISTERED') {
      await source.init();
    }

    return source;
  }

  /**
   * Returns an array of all registered sources.
   */
  getRegisteredSources() {
    return Array.from(this._sources.values()).map(source => ({
      id: source.id,
      name: source.name,
      state: source.state,
      trustLevel: source.trustLevel
    }));
  }
}
