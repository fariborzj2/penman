# ListPlugin Specification

## Options
None

## Internal Execution Rules
1. Uses `editor.ui.registry.addButton` to register UI buttons for `bullist` and `numlist`.
2. Delegates execution logic to `CommandManager` using the browser's native `execCommand` fallback mechanism. This avoids overlapping wrapper breakages and list selection bugs that occur when attempting complex native block wrapping manually.
3. Registers state reflection handlers for `queryCommandState` to keep UI buttons synced with the cursor location context.

## Side Effects
- Binds 2 standard list buttons to the toolbar registry.
- Registers 2 custom commands for state query to `CommandManager`.
