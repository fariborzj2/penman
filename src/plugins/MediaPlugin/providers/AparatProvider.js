/**
 * Aparat Media Provider
 */

export const AparatProvider = {
  name: 'aparat',
  type: 'video',

  detect(url) {
    if (!url) return false;
    const regex = /^(?:https?:\/\/)?(?:www\.)?aparat\.com\/(?:v\/|video\/video\/embed\/videohash\/)([a-zA-Z0-9]+)/;
    return regex.test(url.trim());
  },

  extract(url) {
    if (!url) return null;
    const regex = /^(?:https?:\/\/)?(?:www\.)?aparat\.com\/(?:v\/|video\/video\/embed\/videohash\/)([a-zA-Z0-9]+)/;
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
    return `https://www.aparat.com/video/video/embed/videohash/${data.id}/vt/frame`;
  }
};
