# ImagePlugin

Insert images by URL, drag-and-drop, paste, or from a registered gallery. Handles upload pipeline, figure/figcaption rendering, alignment, and a floating toolbar on the selected figure.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['image'],
  toolbar: 'image',
  imageUploadFn: async (file, onProgress) => {
    // POST `file` to your backend and resolve with { url, alt? }
    return { url: 'https://cdn.example.com/...', alt: file.name };
  }
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Button | `image` | Toolbar icon. |
| API | `editor.image` | `{ insertFromURL, insertUntrustedURL, gallery, ... }`. |
| i18n namespace | `plugins.image` | 80+ keys. |
| Icons | `image` | |

## Modal tabs

1. **Direct URL** — paste an external image URL plus optional alt text.
2. **Upload** — drag/drop or file-picker. Files enter a queue with `PENDING / UPLOADING / SUCCESS / ERROR` states; queue persists if the modal is reopened. Calls `imageUploadFn(file, onProgress)` you provide.
3. **Gallery** — lists images from registered sources (`editor.image.gallery.registerSource(...)`); click to insert, hover for copy-URL button.

## Floating toolbar

When an image is selected, a floating bubble appears with:
- Align left / center / right
- Edit image (reopens the modal preloaded with the current image's URL/alt)
- Delete image (confirms via modal before removal)

Tooltips use the standard themed Tooltip service; `aria-label` is set for screen readers.

## Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `imageUploadFn` | `async (file, onProgress) => { url, alt? }` | none | Required for upload + drag/drop. Without it, the Upload tab is hidden. |

## API surface

- `editor.image.insertFromURL(url, alt)` — TRUSTED URL, inserted without validation.
- `editor.image.insertUntrustedURL(url, alt)` — validated against the sanitizer's URL allowlist.
- `editor.image.gallery.registerSource({ id, name, trustLevel, list, get })` — register a gallery source returning `{ items, nextCursor }`.

## Boundaries

- Does NOT host images itself. `imageUploadFn` is provided by the host app.
- Does NOT generate alt text. Run the Audit plugin to find images missing alt.
