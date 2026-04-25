/**
 * Media Renderer
 * Constructs the `<figure>` block node containing the lazy-loaded iframe.
 */

export class MediaRenderer {
  /**
   * Renders a standardized media figure block.
   * @param {Object} mediaData
   * @returns {HTMLElement} The constructed <figure> element.
   */
  static render(mediaData) {
    const figure = document.createElement('figure');
    figure.className = 'penman-media penman-media-block';

    // STRICT RULE: Prevents cursor from entering the media block natively
    figure.setAttribute('contenteditable', 'false');

    // Metadata dataset binding
    figure.dataset.mediaId = mediaData.id || `media-${Date.now()}`;
    figure.dataset.provider = mediaData.provider || 'custom';
    figure.dataset.kind = mediaData.kind || 'embed';
    figure.dataset.src = mediaData.src || '';

    // Outer wrapper for responsive iframe (16:9 ratio default)
    const wrapper = document.createElement('div');
    wrapper.className = 'penman-media-wrapper';

    const is4by3 = mediaData.aspectRatio === '4/3';
    const paddingBottom = is4by3 ? '75%' : '56.25%';

    wrapper.style.position = 'relative';
    wrapper.style.paddingBottom = paddingBottom;
    wrapper.style.height = '0';
    wrapper.style.width = '100%';
    wrapper.style.overflow = 'hidden';

    // Core Frame element
    const frame = document.createElement('iframe');
    frame.src = mediaData.embedUrl;
    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = '0';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');

    // STRICT RULE: Native lazy loading
    frame.setAttribute('loading', 'lazy');

    // Overlay to capture pointer events (clicks) so the node can be selected
    const overlay = document.createElement('div');
    overlay.className = 'penman-media-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '10';
    overlay.style.cursor = 'pointer';

    wrapper.appendChild(frame);
    wrapper.appendChild(overlay);
    figure.appendChild(wrapper);

    return figure;
  }
}
