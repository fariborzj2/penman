/**
 * YouTube Media Provider
 */

export const YoutubeProvider = {
  name: 'youtube',
  type: 'video',

  detect(url) {
    if (!url) return false;
    const regex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return regex.test(url.trim());
  },

  extract(url) {
    if (!url) return null;
    const regex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.trim().match(regex);

    if (match && match[1]) {
      return {
        id: match[1],
        url: url.trim()
      };
    }
    return null;
  },

  toEmbedUrl(data) {
    if (!data || !data.id) return '';
    return `https://www.youtube.com/embed/${data.id}`;
  }
};
