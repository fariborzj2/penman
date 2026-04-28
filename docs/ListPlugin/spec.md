# ListPlugin Specification

## Options
None

## Internal Execution Rules
1. Uses `editor.ui.registry.addButton` to register UI buttons for `bullist`, `numlist`, `indentlist`, and `outdentlist`.
2. Delegates `bullist` and `numlist` logic to `CommandManager` using the browser's native `execCommand` fallback mechanism.
3. Implements `indentList` and `outdentList` using manual DOM manipulation to ensure robust nesting control and selection preservation.
4. `indentList` moves selected `<li>` elements into a nested list inside their previous sibling.
5. `outdentList` moves selected `<li>` elements up one level, or converts them to `<p>` if they are at the top level.
6. Registers state reflection handlers for `queryCommandState` to keep UI buttons synced with the cursor location context.
7. Listens for `Tab` and `Shift+Tab` keys within `editor.editableArea` to trigger indent/outdent commands.

## Side Effects
- Binds 4 list-related buttons to the toolbar registry.
- Registers 4 custom commands to `CommandManager`.
- Adds a `keydown` listener for `Tab` handling.
