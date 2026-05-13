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
    
    // Support for direct media specific attributes
    if (mediaData.poster) figure.dataset.poster = mediaData.poster;
    if (mediaData.title) figure.dataset.title = mediaData.title;
    if (mediaData.controls !== undefined) figure.dataset.controls = String(mediaData.controls);
    if (mediaData.autoplay !== undefined) figure.dataset.autoplay = String(mediaData.autoplay);

    // Outer wrapper for responsive iframe (16:9 ratio default)
    const wrapper = document.createElement('div');
    wrapper.className = 'penman-media-wrapper';
    
    // Default to 16:9
    const is4by3 = mediaData.aspectRatio === '4/3';
    let paddingBottom = is4by3 ? '75%' : '56.25%';
    
    // If it's direct audio, height can be fixed or auto, but let's give it a fixed small height
    if (mediaData.kind === 'audio' && mediaData.provider === 'direct') {
       paddingBottom = '0';
       wrapper.style.height = '50px';
    } else {
       wrapper.style.height = '0';
       wrapper.style.paddingBottom = paddingBottom;
    }

    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.overflow = 'hidden';

    let mediaElement;

    if (mediaData.provider === 'direct') {
      if (mediaData.kind === 'video') {
        mediaElement = document.createElement('video');
        if (mediaData.poster) mediaElement.poster = mediaData.poster;
      } else {
        mediaElement = document.createElement('audio');
      }

      if (mediaData.title) mediaElement.title = mediaData.title;
      if (mediaData.controls !== false) mediaElement.controls = true; // default true
      if (mediaData.autoplay) mediaElement.autoplay = true;
      // <video> and <audio> don't support loading="lazy" (that's an <img>/
      // <iframe>-only attribute). The standards-track equivalent is
      // preload="metadata", which fetches just enough bytes to know the
      // media's duration/dimensions and defers the actual playback bytes
      // until the user hits play. Autoplay cases obviously need full
      // preload, so we leave those alone.
      if (!mediaData.autoplay && !mediaElement.hasAttribute('preload')) {
        mediaElement.setAttribute('preload', 'metadata');
      }

      mediaElement.src = mediaData.embedUrl;
      mediaElement.style.position = 'absolute';
      mediaElement.style.top = '0';
      mediaElement.style.left = '0';
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';

    } else {
      // Core Frame element for embeds
      mediaElement = document.createElement('iframe');
      mediaElement.src = mediaData.embedUrl;
      if (mediaData.title) mediaElement.title = mediaData.title;
      mediaElement.style.position = 'absolute';
      mediaElement.style.top = '0';
      mediaElement.style.left = '0';
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';
      mediaElement.setAttribute('frameborder', '0');
      mediaElement.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      // Defer cross-origin embeds (YouTube, Vimeo, etc.) until they're
      // about to scroll into view. The sanitizer already whitelists this
      // attribute for <iframe>, so it survives every round-trip.
      mediaElement.setAttribute('loading', 'lazy');
      
      // STRICT RULE: Native lazy loading
      mediaElement.setAttribute('loading', 'lazy');
    }

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

    wrapper.appendChild(mediaElement);
    wrapper.appendChild(overlay);
    figure.appendChild(wrapper);

    return figure;
  }
}
