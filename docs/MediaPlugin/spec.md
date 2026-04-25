# Media Plugin Technical Specification

## Core Responsibilities
- Embed external media (Video/Audio/Embed) strictly by URL. No binary file upload.
- Execute within a provider-based architecture.
- Maintain absolute security boundaries by exclusively permitting whitelisted iframe sources.
- Expose the media element strictly as a Block Node inside the Penman editor tree.

## Media Node Schema Detail
Inside the Penman editor DOM, media is represented structurally as follows:
```html
<figure class="penman-media penman-media-block" contenteditable="false" data-media-id="uuid" data-provider="youtube" data-kind="video" data-src="original-url">
  <div class="penman-media-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0;">
    <iframe src="embed-url" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="autoplay; fullscreen" loading="lazy"></iframe>
  </div>
</figure>
```
The node strictly uses `contenteditable="false"` to prevent cursor entry.

## Provider Details

### 1. YouTube Provider
- **Detection**: `/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/`
- **Extraction**: Returns `{ id, url: inputUrl }`
- **Embed URL**: `https://www.youtube.com/embed/{id}`

### 2. Aparat Provider
- **Detection**: `/^(?:https?:\/\/)?(?:www\.)?aparat\.com\/v\/([a-zA-Z0-9]+)/`
- **Extraction**: Returns `{ id, url: inputUrl }`
- **Embed URL**: `https://www.aparat.com/video/video/embed/videohash/{id}/vt/frame`

### 3. Custom Whitelist Provider
- **Detection**: Checked against `SecurityValidation.isWhitelisted(url)`
- **Extraction**: Returns `{ id: url, url: url }`
- **Embed URL**: Same as extracted URL.

## Interaction Behaviors
- **Selection**: Handled by hooking into Penman's internal SelectionManager logic, specifically responding to `mousedown` on `figure.penman-media`.
- **Keyboard Navigation**: Arrows keys must bypass the `contenteditable="false"` block (jump over it).
- **Deletion**: Pressing Backspace/Delete when the node is selected must remove the full `<figure>`.

## Floating UI
When a media node is selected, a FloatingUI may be presented to allow alignment adjustments or deletion, similar to the existing ImagePlugin logic.