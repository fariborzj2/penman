# ListPlugin Usage

## Step-by-step usage
1. Include `list` in plugins.
2. Include `bullist` or `numlist` in toolbar.
3. Click to start a list, press Enter for new list items.
4. Press Enter twice to exit the list.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['list'],
  toolbar: ['bullist', 'numlist']
});
```

## API signatures
- `setupListPlugin(editor: Editor): void`

## Configuration examples
```javascript
// Only allow unordered lists
const editor = penman.init({
  selector: '#editor',
  plugins: ['list'],
  toolbar: ['bullist']
});
```

## Integration points with other plugins
- Core engine keyboard interceptions (like handling block conversions) natively support `li` DOM nodes mapped by lists.

## Common misuse cases
- Attempting to use `BlockTypePlugin` dropdown to change a list item `<li>` into an `<h1>`. The list elements must be cleared or converted to paragraphs first before block transformation.
