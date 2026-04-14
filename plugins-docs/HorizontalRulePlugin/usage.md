# HorizontalRulePlugin Usage

## Step-by-step usage
1. Add `hr` to `plugins` and `toolbar`.
2. Place cursor where you want a horizontal line.
3. Click the "Insert Horizontal Rule" button.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['hr'],
  toolbar: ['hr']
});
```

## API signatures
- `setupHorizontalRulePlugin(editor: Editor): void`
- `editor.execCommand('INSERT_HORIZONTAL_RULE'): void`

## Configuration examples
```javascript
// Typical inclusion with layout tools
const editor = penman.init({
  selector: '#editor',
  plugins: ['hr', 'table'],
  toolbar: ['hr', 'table']
});
```

## Integration points with other plugins
- Acts as a block-level boundary similar to paragraph breaks.

## Common misuse cases
- Expecting the `<hr>` to be placed inline with text. The internal execution logic forcefully breaks the current block node into two sections before inserting the rule.
