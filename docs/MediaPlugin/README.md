# MediaPlugin

Insert video/audio media via tabbed modal. Supports direct URLs (mp4/webm/mp3) and provider embeds (YouTube, Vimeo, Aparat, or custom-whitelisted iframes).

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['media'],
  toolbar: 'media'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Button | `media` | Toolbar icon. |
| API | `editor.media` | `{ insertNode, updateNode }`. |
| i18n namespace | `plugins.media` | 35+ keys. |
| Icons | `media` | |

## Modal tabs

1. **Direct link** — paste a video/audio URL. Optional title, poster image, autoplay, controls. Live preview rendered with native `<video>`/`<audio>`.
2. **Embed / Services** — paste any URL. Auto-detect mode tries the registered providers (YouTube, Vimeo, Aparat). When auto-detect is off, runs custom-provider validation against a domain allowlist. Pick aspect ratio (16:9 / 4:3) and an optional title. Live preview shows the iframe.

## Provider registry

Providers live in `plugins/MediaPlugin/providers/`. Each provider has:

```js
{
  id: 'youtube',
  match: (url) => boolean,
  extract: (url) => ({ embedUrl, kind, provider })
}
```

Custom providers can be added at runtime:

```js
import { createCustomProvider } from 'penman-editor/dist/...';
editor.media.providers.register(createCustomProvider({
  id: 'my-cdn',
  hosts: ['video.example.com'],
  embedTemplate: (id) => `https://video.example.com/embed/${id}`
}));
```

## Security

`SecurityValidation` enforces:
- iframe `src` must be `https://` (or `http://` if explicitly allowed).
- domain must match a known provider OR be on the custom allowlist.
- no `<script>` payloads survive sanitization.
