# UnlinkPlugin Usage

## Step-by-step usage
1. Add `unlink` to plugins and toolbar.
2. Place cursor anywhere inside an existing hyperlink, or highlight text containing a hyperlink.
3. Click the "Unlink" button.
4. The anchor wrapper is stripped and the text remains.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['unlink'],
  toolbar: ['unlink']
});
```

## API signatures
- `setupUnlinkPlugin(editor: Editor): void`
- `editor.execCommand('REMOVE_LINK'): void`

## Configuration examples
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['link', 'unlink'],
  toolbar: ['link', 'unlink']
});
```

## Integration points with other plugins
- Partner plugin to `LinkPlugin`. Handles the cleanup phase.

## Common misuse cases
- Using `RemoveFormatPlugin` to attempt to remove links. While `CLEAR_FORMATTING` does remove links natively because `a` is in the `inlineTags` list, `REMOVE_LINK` is specifically designed for surgical removal of the link wrapper while preserving other inline formats inside it (like bolding).
