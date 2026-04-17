# BlockTypePlugin Usage

## Step-by-step usage
1. The plugin is automatically registered within `PluginManager`.
2. Provide `blockTypes` in `editor.options` during initialization if you want custom types.
3. Add `blocktype` to the toolbar configuration in `editor.ui.registry`.
4. Click the "Paragraph" (or active block type) button in the toolbar to open the searchable list.
5. Select a block type from the list to apply it to the current cursor position.

## Configuration and Features

The user can customize the allowed block types when initializing the editor. Each block type now supports the following properties:

- **name**: The label displayed in the dropdown menu.  
- **cmd**: The corresponding HTML tag (e.g., `h1`, `p`, `div`).  
- **class**: (optional) A CSS class applied to the block during formatting.  
- **optionStyle**: (optional) Inline styles used only for rendering the item inside the dropdown menu, allowing a visual preview of the block before selection.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['blocktype'],
  toolbar: ['blocktype'],
  blockTypes: [
    { name: 'Paragraph', cmd: 'p' },
    { name: 'Subheading', cmd: 'h3' },
    { name: 'Quote', cmd: 'blockquote' },
    {
      name: 'Warning',
      cmd: 'div',
      class: 'warning-block',
      optionStyle: { color: 'red', fontWeight: 'bold' }
    }
  ]
});
```

## API signatures
- `setupBlockTypePlugin(editor: Editor): void`

## Configuration examples
```javascript
// Minimal configuration using default block types
const editor = penman.init({
  selector: '#editor',
  plugins: ['blocktype'],
  toolbar: ['blocktype']
});
```

## Integration points with other plugins
- Works alongside `FormatPlugin` (bold, italic) without clearing inline styles.
- Listens to core `selectionChange` events to dynamically update UI.

## Common misuse cases
- Passing non-block HTML tags (like `span` or `strong`) into `cmd` inside `blockTypes`. This will cause the browser's `formatBlock` engine to fail or behave unpredictably.
