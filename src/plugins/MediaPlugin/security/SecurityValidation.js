/**
 * SecurityValidation Layer
 * Strictly validates media URLs against a domain whitelist to prevent XSS.
 */

export class SecurityValidation {
  constructor(options = {}) {
    this.whitelist = [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'aparat.com',
      'www.aparat.com'
    ];

    if (options.whitelist && Array.isArray(options.whitelist)) {
      this.whitelist.push(...options.whitelist);
    }
  }

  /**
   * Validates if a given URL string belongs to a whitelisted domain.
   * @param {string} url - The URL to validate.
   * @returns {boolean} True if whitelisted, false otherwise.
   */
  isWhitelisted(url) {
    if (!url) return false;

    // Fast check for malicious script protocols
    if (url.trim().toLowerCase().startsWith('javascript:')) return false;
    if (url.trim().toLowerCase().startsWith('vbscript:')) return false;
    if (url.trim().toLowerCase().startsWith('data:')) return false;

    try {
      const parsed = new URL(url.trim());
      const hostname = parsed.hostname.toLowerCase();

      // Allow exact match or subdomain match for whitelisted domains
      return this.whitelist.some(domain =>
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch (e) {
      // If the URL fails to parse entirely, reject it
      return false;
    }
  }

  /**
   * Sanitizes a URL string by ensuring it starts with http/https
   * and does not contain dangerous protocols.
   */
  sanitizeURL(url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';

    if (trimmed.toLowerCase().startsWith('javascript:') ||
        trimmed.toLowerCase().startsWith('vbscript:') ||
        trimmed.toLowerCase().startsWith('data:')) {
      return '';
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
      return '';
    } catch (e) {
      // If it doesn't parse as absolute, attempt to prefix https://
      // Note: in context of iframes we generally expect absolute URLs.
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        try {
          const httpsParsed = new URL(`https://${trimmed}`);
          return httpsParsed.toString();
        } catch (err) {
          return '';
        }
      }
      return '';
    }
  }
}
