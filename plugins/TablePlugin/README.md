# TablePlugin

## Exact purpose of the plugin
Provides comprehensive table creation, formatting, and structural modification capabilities (merge, split, rows, columns, properties).

## System role
Registers `INSERT_TABLE`, `SET_TABLE_PROPERTIES`, `OPEN_TABLE_PROPERTIES_MODAL` commands. Initializes a separate `TableSelectionManager` and `TableGrid` model for spatial validation. Utilizes a `TableTransaction` class to safely capture and mutate table structures deterministically without relying on `innerHTML` replacement for the whole table.

## Clear boundary of what it DOES NOT do
- Does NOT allow nested tables.
- Does NOT use CSS `display: none` for merged cells (strictly mutates `colspan`/`rowspan` and physically removes child cells).
- Does NOT allow full DOM table cloning and replacement during transactions.

## Dependencies
- `TableTransaction`
- `TableSelectionManager`
- `TableGrid`
- `FloatingUI`
- `TableMenu`
- `ColorPicker`
- `editor.commands` (CommandManager)
- `editor.ui.createModal` (UIManager)
