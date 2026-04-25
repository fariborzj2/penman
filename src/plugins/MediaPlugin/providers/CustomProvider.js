/**
 * Custom Embed Provider
 * Strictly relies on the injected SecurityValidation instance to permit
 * URLs matching the user's whitelist configurations.
 */

export function createCustomProvider(securityValidator) {
  return {
    name: 'custom',
    type: 'embed',

    detect(url) {
      if (!url) return false;
      return securityValidator.isWhitelisted(url);
    },

    extract(url) {
      if (!url) return null;
      if (!securityValidator.isWhitelisted(url)) return null;

      const sanitized = securityValidator.sanitizeURL(url);
      if (!sanitized) return null;

      return {
        id: sanitized, // Fallback ID is the URL itself
        url: sanitized
      };
    },

    toEmbedUrl(data) {
      if (!data || !data.url) return '';
      return data.url;
    }
  };
}
