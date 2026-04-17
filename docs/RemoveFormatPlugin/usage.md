# RemoveFormatPlugin Usage

## Step-by-step usage
1. Add `removeformat` to plugins and toolbar.
2. Select text containing multiple overlapping styles (e.g., bold + blue + font size 24).
3. Click the "Clear Formatting" button.
4. All inline styles and tags are stripped, leaving plain text.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['removeformat'],
  toolbar: ['removeformat']
});
```

## API signatures
- `setupRemoveFormatPlugin(editor: Editor): void`
- `editor.execCommand('CLEAR_FORMATTING'): void`

## Configuration examples
```javascript
// Usually placed at the end of a formatting group
const editor = penman.init({
  selector: '#editor',
  plugins: ['format', 'fontsize', 'removeformat'],
  toolbar: ['bold', 'italic', 'fontsize', '|', 'removeformat']
});
```

## Integration points with other plugins
- Essential for cleaning up residual spans from `FontSizePlugin` or native formatting left over by external copy-pastes.

## Common misuse cases
- Expecting `CLEAR_FORMATTING` to remove header tags (`<h1>`). It strictly targets a hardcoded array of `inlineTags`.
