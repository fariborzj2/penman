/**
 * Single source of truth for platform detection so plugins / UI / help can
 * stop reinventing it. Returns true if the current platform looks Apple.
 *
 * Safe to call in non-browser environments (returns false).
 *
 * @returns {boolean}
 */
export function isMac() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const plat = navigator.platform || '';
  return /Mac|iPhone|iPad|iPod/i.test(plat) || /Mac|iPhone|iPad|iPod/i.test(ua);
}

/** Modifier key glyph for keyboard shortcut display (⌘ on Mac, Ctrl elsewhere). */
export function modKey() {
  return isMac() ? '⌘' : 'Ctrl';
}
