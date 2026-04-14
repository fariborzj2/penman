# ImagePlugin Usage

## Step-by-step usage
1. Ensure the backend implements an upload endpoint if drag/drop is required.
2. Initialize the editor with `image` in `plugins` and provide `imageUploadFn`.
3. Users can drag and drop image files directly onto the editor surface, or paste them from the clipboard.
4. Developers can programmatically insert URLs via `editor.image.insertUntrustedURL(url)`.

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
- Alignment utilizes the core DOM rendering pipeline intercepting CSS.

## Common misuse cases
- Utilizing `insertFromURL` with untrusted user input. Developers must explicitly utilize `insertUntrustedURL` when inserting endpoints that are unverified, triggering the internal `TrustLevel.UNTRUSTED` protocol.
