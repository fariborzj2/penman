# LinkPlugin Usage (includes Unlink)

## Step-by-step usage for Link
1. Add `link` to plugins and toolbar.
2. Select text to turn into a link.
3. Click the Link button.
4. Fill in the URL and configure Target/Rel.
5. Click Submit in the modal.

## Step-by-step usage for Unlink
1. Place cursor anywhere inside an existing hyperlink, or highlight text containing a hyperlink.
2. Click the "Unlink" button in the toolbar.
3. The anchor wrapper is stripped and the text remains.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['link'],
  toolbar: ['link']
});
```

## API signatures
- `setupLinkPlugin(editor: Editor): void`
- `editor.execCommand('REMOVE_LINK'): void`

## Configuration examples
```javascript
// Link and unlink together (unlink logic is included in link plugin)
const editor = penman.init({
  selector: '#editor',
  plugins: ['link'],
  toolbar: ['link', 'unlink']
});
```

## Common misuse cases
- Leaving the text field blank when no text is currently selected in the editor. (The plugin prevents failure by utilizing the safe URL string as the text payload automatically).
- Using `RemoveFormatPlugin` to attempt to remove links. While `CLEAR_FORMATTING` does remove links natively because `a` is in the `inlineTags` list, `REMOVE_LINK` is specifically designed for surgical removal of the link wrapper while preserving other inline formats inside it (like bolding).
