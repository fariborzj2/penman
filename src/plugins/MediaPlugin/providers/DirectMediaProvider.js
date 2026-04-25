/**
 * Direct Media Providers (Audio / Video)
 * Detects direct file extensions and returns proper metadata.
 */

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a)$/i;

export const DirectVideoProvider = {
  name: 'direct',
  type: 'video',

  detect(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return VIDEO_EXTENSIONS.test(parsed.pathname);
    } catch {
      return false;
    }
  },

  extract(url) {
    if (!url) return null;
    return {
      id: `video-${Date.now()}`,
      url: url.trim()
    };
  },

  toEmbedUrl(data) {
    if (!data || !data.url) return '';
    return data.url;
  }
};

export const DirectAudioProvider = {
  name: 'direct',
  type: 'audio',

  detect(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return AUDIO_EXTENSIONS.test(parsed.pathname);
    } catch {
      return false;
    }
  },

  extract(url) {
    if (!url) return null;
    return {
      id: `audio-${Date.now()}`,
      url: url.trim()
    };
  },

  toEmbedUrl(data) {
    if (!data || !data.url) return '';
    return data.url;
  }
};
