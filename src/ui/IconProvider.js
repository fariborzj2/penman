export class IconProvider {
  constructor() {
    // Core editor icons only. Plugin-owned icons live in
    // plugins/<PluginName>/icons/index.js and are registered via register().
    this.icons = {
      undo:          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
      redo:          '<svg width="18" height="18" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>',
      justifyleft:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/></svg>',
      justifycenter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H3"/><path d="M17 12H7"/><path d="M19 19H5"/></svg>',
      justifyright:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H3"/><path d="M21 12H9"/><path d="M21 19H7"/></svg>',
      justifyfull:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18"/><path d="M3 12h18"/><path d="M3 19h18"/></svg>'
    };
  }

  /**
   * Register plugin-owned icons. Names are lower-cased and merged into the
   * central icon map so getIcon() resolves them like core icons.
   *
   * Plugins should call this in their setup() entry point with the icons that
   * live in their own folder (e.g. plugins/LinkPlugin/icons/index.js).
   *
   * @param {Record<string, string>} icons - Map of iconName → SVG string.
   *
   * @example
   *   editor.icons.register({
   *     link:   '<svg ...>',
   *     unlink: '<svg ...>'
   *   });
   */
  register(icons) {
    if (!icons || typeof icons !== 'object') return;
    for (const name of Object.keys(icons)) {
      if (typeof icons[name] !== 'string') continue;
      this.icons[name.toLowerCase()] = icons[name];
    }
  }

  /**
   * Returns an HTML string representing the icon for the given name.
   * Provides actual inline SVG icons.
   *
   * @param {string} iconName
   * @returns {string}
   */
  getIcon(iconName) {
    if (!iconName) return '';
    const normalizedName = iconName.toLowerCase();

    // Return the matched SVG or a fallback text span if not found
    if (this.icons[normalizedName]) {
      return this.icons[normalizedName];
    }

    const label = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    return `<span class="penman-icon-fallback">${label}</span>`;
  }
}
