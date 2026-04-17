# FormatPlugin Usage

## Step-by-step usage
1. Add `format` to `plugins`.
2. Add `bold`, `italic`, `underline` to the `toolbar` config.
3. Highlight text in the editor and click the respective buttons.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['format'],
  toolbar: ['bold', 'italic', 'underline']
});
```

## API signatures
- `setupFormatPlugin(editor: Editor): void`

## Configuration examples
```javascript
// Using only partial formatting tools
const editor = penman.init({
  selector: '#editor',
  plugins: ['format'],
  toolbar: ['bold', 'italic'] // Omitting underline
});
```

## Integration points with other plugins
- Cleared seamlessly by `RemoveFormatPlugin`.
- Preserved when using `BlockTypePlugin` wrapper changes.

## Common misuse cases
- Trying to configure custom classes for bold text. This plugin strictly invokes native browser tags (`<b>`/`<strong>`).
