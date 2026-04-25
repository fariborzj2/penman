# Insert Media Plugin Specification

## Overview
The Insert Media Plugin is a production-grade component for the Penman block-based rich text editor that allows users to embed external media purely via URLs. No file uploads are permitted.

## Providers Architecture
The core design mandates a provider-based architecture. A Provider Registry maintains the list of enabled providers.

Each provider MUST implement the following interface:
```javascript
{
  name: string,
  detect: (url: string) => boolean,
  extract: (url: string) => object | null, // e.g. { id: '...', url: '...' }
  toEmbedUrl: (data: object) => string,
  type: "video" | "audio" | "embed"
}
```

### Supported Providers
1. **YouTube**:
   - Supports both `youtube.com/watch?v={id}` and `youtu.be/{id}`.
2. **Aparat**:
   - Extracts `{id}` from `aparat.com/v/{id}`.
   - Maps to embed structure: `https://www.aparat.com/video/video/embed/videohash/{id}/vt/frame`.
3. **Custom Embed**:
   - A generic iframe embed handler strictly restricted to whitelisted domains.

## Media Node Schema
Nodes are serialized and injected into the editor with the following properties:
```javascript
{
  id: string,                 // Unique UUID-like identifier
  type: "media",              // Fixed to 'media'
  kind: "video" | "audio" | "embed", // Dependent on the provider
  provider: "youtube" | "aparat" | "custom",
  src: string,                // Original URL input
  embedUrl: string,           // Final source used in the iframe/renderer
  aspectRatio: "16/9" | "4/3", // Configuration option (default 16/9)
  controls: boolean,          // HTML5 controls (if native)
  autoplay: boolean
}
```

## Security Rules (CRITICAL)
- Embedded sources are STRICTLY constrained to whitelisted domains (e.g. `youtube.com`, `aparat.com`).
- Direct script injection or unsanitized iframe embedding is strictly rejected.
- All rendered iframes must implement native browser lazy loading (`loading="lazy"`).
- Absolute validation of attributes to prevent XSS.

## Editor Integration & Behaviour
- Inserted media instances operate exclusively as **BLOCK NODES**.
- Clicking or interacting with the media block selects the entire node.
- Cut/Copy events transfer the full node state.
- Deletion removes the complete node structure.
- The editor Caret (cursor) MUST NOT be permitted to enter inside the media block.
- Drag & Drop repositioning is only allowed at the block boundaries.

## UI Elements
- The modal allows input of the URL.
- Auto-detect provider toggle.
- A live preview rendering area.
- Configuration selectors (Aspect Ratio, Media Type dropdown).
- Submit and Cancel action buttons.
- Real-time validation error states.
