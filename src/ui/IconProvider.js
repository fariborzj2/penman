export class IconProvider {
  /**
   * Returns an HTML string representing the icon for the given name.
   * As per phase requirements, this acts as an abstraction layer returning a simple span.
   * Actual SVG implementation is out of current phase scope.
   *
   * @param {string} iconName
   * @returns {string}
   */
  getIcon(iconName) {
    if (!iconName) return '';
    const label = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    return `<span class="penman-icon-placeholder">${label}</span>`;
  }
}
