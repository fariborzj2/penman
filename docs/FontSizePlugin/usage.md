# FontSizePlugin Usage

## Step-by-step usage
1. Add `fontsize` to `plugins` and `toolbar` config.
2. Select text inside the editor.
3. Click the Size dropdown in the toolbar.
4. Select a size from the list (e.g., `18px`).
5. The selected text is now wrapped in a `<span>` with explicit CSS `font-size`.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['fontsize'],
  toolbar: ['fontsize'],
  fontSizes: ['10px', '12px', '14px', '18px', '24px']
});
```

## API signatures
- `setupFontSizePlugin(editor: Editor): void`
- `editor.execCommand('SET_FONT_SIZE', size: string): void`

## Configuration examples
```javascript
// Using custom units like 'em' or 'rem'
const editor = penman.init({
  selector: '#editor',
  plugins: ['fontsize'],
  toolbar: ['fontsize'],
  fontSizes: ['0.8rem', '1rem', '1.2rem', '2rem']
});
```

## Integration points with other plugins
- Interacts closely with `RemoveFormatPlugin`. When `CLEAR_FORMATTING` is executed, the generated `<span>` tags with `font-size` are manually unwrapped.

## Common misuse cases
- Passing integers instead of CSS dimension strings in `fontSizes` (e.g., `fontSizes: [12, 14]`). The strings must be valid CSS properties (e.g., `12px`, `1.5em`).
