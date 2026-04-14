# FindReplacePlugin Usage

## Step-by-step usage
1. Add `findreplace` to your `plugins` and `toolbar` configuration.
2. Click the "Find and Replace" button or press `Cmd/Ctrl + F` inside the editor.
3. The Modal UI will open. Type the string to search for in the "Find" input.
4. The editor highlights matches natively. Navigate using "Next" and "Previous" buttons.
5. Type a replacement string in the "Replace with" input.
6. Click "Replace" to replace the active occurrence, or "Replace all" to replace all matches simultaneously.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['findreplace'],
  toolbar: ['findreplace']
});
```

## API signatures
- `setupFindReplacePlugin(editor: Editor): void`

## Configuration examples
```javascript
// Ensure UI registry can instantiate modals
const editor = penman.init({
  selector: '#editor',
  plugins: ['findreplace', 'format'],
  toolbar: ['bold', 'italic', '|', 'findreplace']
});
```

## Integration points with other plugins
- Fully compatible with `HistoryManager`. Operations like "Replace all" explicitly push an atomic state using `editor.history.takeSnapshot()` and `editor.history.pushImmediate()`.

## Common misuse cases
- Attempting to search for HTML tags (e.g., searching for `<b>text</b>`). The plugin text-mapper strictly maps and searches `Node.TEXT_NODE` values, bypassing DOM tags.
