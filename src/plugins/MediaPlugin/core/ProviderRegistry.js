/**
 * Provider Registry
 * Maintains the list of enabled media providers without hardcoded chains.
 */

export class ProviderRegistry {
  constructor() {
    this.providers = [];
  }

  /**
   * Registers a new provider into the registry.
   * @param {Object} provider
   */
  register(provider) {
    if (!provider || typeof provider.name !== 'string' || typeof provider.detect !== 'function' || typeof provider.extract !== 'function' || typeof provider.toEmbedUrl !== 'function') {
      throw new Error('Invalid Media Provider Interface');
    }
    this.providers.push(provider);
  }

  /**
   * Finds the first provider capable of handling the URL.
   * @param {string} url
   * @returns {Object|null} The matching provider or null.
   */
  match(url) {
    for (const provider of this.providers) {
      if (provider.detect(url)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Processes a URL, returning the structured media data if matched.
   * @param {string} url
   * @returns {Object|null} Extracted data containing provider info, or null if no match.
   */
  process(url) {
    const provider = this.match(url);
    if (!provider) return null;

    const data = provider.extract(url);
    if (!data) return null;

    return {
      provider: provider.name,
      kind: provider.type,
      id: data.id,
      src: data.url,
      embedUrl: provider.toEmbedUrl(data)
    };
  }
}
