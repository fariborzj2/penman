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
