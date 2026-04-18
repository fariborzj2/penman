# ImagePlugin Usage

## Step-by-step usage
1. Ensure the backend implements an upload endpoint if drag/drop is required.
2. Initialize the editor with `image` in `plugins` and provide `imageUploadFn`.
3. Users can drag and drop image files directly onto the editor surface, or paste them from the clipboard.
4. Users can open the Image modal which features multi-select upload workflows.
   - Selected images enter an automated queue with independent states (`PENDING`, `UPLOADING`, `SUCCESS`, `ERROR`).
   - The queue automatically triggers the `imageUploadFn` for each item.
   - Users manually click "Insert" to embed the successful (`SUCCESS`) images into the editor.
5. Users can also select images from registered gallery sources using the Gallery mode.
6. Developers can programmatically insert URLs via `editor.image.insertUntrustedURL(url)`.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['image'],
  imageUploadFn: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/upload', { method: 'POST', body: formData });
    const data = await response.json();
    return data.url;
  }
});
```

## API signatures
- `setupImagePlugin(editor: Editor): void`
- `editor.image.insertFromURL(url: string, alt: string): void`
- `editor.image.insertUntrustedURL(url: string, alt: string): void`
- `editor.image.upload(files: FileList | File[]): void`
- `editor.image.setAlignment(figure: HTMLElement, alignment: string): void`

## Gallery Mode Registration

The Gallery System allows users to search and select images from external or internal libraries directly from the "Gallery" tab in the Image modal. A gallery source must follow a strict contract.

### The Source Contract

A Gallery source requires an `id`, a `name`, and two core methods: `list()` and `get()`. It can optionally include an `auth()` method that resolves before loading images.

Each source explicitly declares its `trustLevel` (`TRUSTED` or `UNTRUSTED`). An `ImageItem` inherits its source's trust level immutably.

### Expected `ImageItem` JSON Schema

When `list` or `get` resolves, the returned items must adhere to the following `ImageItem` schema:

```json
{
  "id": "string",
  "url": "string (full image url)",
  "thumbnailUrl": "string (optional, defaults to url)",
  "title": "string (optional, alt text)",
  "width": "number (optional)",
  "height": "number (optional)"
}
```

### Registration Example

You can register gallery sources against the `editor.image.gallery` API instance:

```javascript
// Register an external source (e.g., Unsplash api)
editor.image.gallery.registerSource({
  id: 'unsplash',
  name: 'Unsplash Images',
  trustLevel: 'UNTRUSTED', // Enforce strict validation

  // Optional auth method executed once upon initial load
  auth: async () => {
    const token = await fetchMyUnsplashToken();
    return token !== null; // Returns boolean
  },

  // Required list method returning a GalleryListResponse
  list: async (cursor = null, limit = 20) => {
    const res = await fetch(`https://api.unsplash.com/photos?page=${cursor || 1}&per_page=${limit}`);
    const data = await res.json();

    // Map external API response to the required ImageItem schema
    const items = data.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.thumb,
      title: photo.alt_description || photo.description
    }));

    return {
      items: items,
      nextCursor: cursor ? cursor + 1 : 2 // Used for pagination
    };
  },

  // Required get method for fetching a single item by ID
  get: async (id) => {
    const res = await fetch(`https://api.unsplash.com/photos/${id}`);
    const photo = await res.json();
    return {
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.thumb,
      title: photo.alt_description || photo.description
    };
  }
});
```

## Configuration examples
```javascript
// Disabling uploads natively by omitting imageUploadFn
// Drag and drop will throw errors or do nothing depending on internal strict checks
const editor = penman.init({
  selector: '#editor',
  plugins: ['image']
});
```

## Integration points with other plugins
- Native integration with `HistoryManager` snapshot controller.
  - *Dependency requirement:* The plugin requires the history manager to expose the `pushImmediate` method for atomic action tracking (used during alignment and insertions).
- Alignment utilizes the core DOM rendering pipeline intercepting CSS.

## Common misuse cases
- Utilizing `insertFromURL` with untrusted user input. Developers must explicitly utilize `insertUntrustedURL` when inserting endpoints that are unverified, triggering the internal `TrustLevel.UNTRUSTED` protocol.
