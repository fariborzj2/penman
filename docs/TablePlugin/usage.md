# TablePlugin Usage

## Step-by-step usage
1. Add `table` to plugins and toolbar.
2. Click the table dropdown and select grid size to instantiate.
3. Click inside the table. A contextual Floating UI will appear.
4. Use the Floating UI to add/remove columns, merge cells, or split cells.
5. Click "Table Properties" in the menu to adjust border, color, padding, spacing, and width.

## Initialization
```javascript
const editor = penman.init({
  selector: '#editor',
  plugins: ['table'],
  toolbar: ['table']
});
```

## API signatures
- `setupTablePlugin(editor: Editor): void`
- `editor.commands.execute('INSERT_TABLE', { rows: number, cols: number }): void`
- `editor.commands.execute('OPEN_TABLE_PROPERTIES_MODAL'): void`
- `editor.commands.execute('SET_TABLE_PROPERTIES', { properties: Object }): void`

## Configuration examples
```javascript
// Bare minimum setup
const editor = penman.init({
  selector: '#editor',
  plugins: ['table'],
  toolbar: ['table']
});
```

## Integration points with other plugins
- Requires `ColorPicker` and `FloatingUI` core components to instantiate contextual menus.
- Binds to `selectionManager.activeTableNode` to maintain active state while interacting with the `BlockTypePlugin` dropdown.

## Common misuse cases
- Attempting to dynamically manipulate table properties via direct DOM `table.style` assignments instead of dispatching the `SET_TABLE_PROPERTIES` command. This circumvents the `TableTransaction` atomic snapshots and destroys history integrity.
