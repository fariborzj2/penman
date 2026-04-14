export const TrustLevel = {
  TRUSTED: 'TRUSTED',
  UNTRUSTED: 'UNTRUSTED'
};

/**
 * Validates the image URL according to strict security rules.
 *
 * @param {string} url - The URL to validate.
 * @param {string} trustLevel - The trust level (TRUSTED or UNTRUSTED).
 * @returns {boolean} True if valid, throws error if invalid.
 */
export function validateURL(url, trustLevel) {
  if (typeof url !== 'string') {
    throw new Error('INVALID_URL');
  }

  if (url.length > 2048) {
    throw new Error('INVALID_URL');
  }

  // If TRUSTED, we skip strict regex validation but still enforce length and basic string type.
  // Wait, spec says: "If trustLevel === UNTRUSTED (or if inserted via raw URL tab), strict regex validation and scheme whitelisting occur. If it fails, execution is aborted synchronously."

  if (trustLevel === TrustLevel.UNTRUSTED) {
    // URL must match regex `^(https?|data:image\/[a-zA-Z+]+;base64,).*`
    const regex = /^(https?|data:image\/[a-zA-Z+]+;base64,).*/;
    if (!regex.test(url)) {
      throw new Error('INVALID_URL');
    }
  }

  return true;
}
