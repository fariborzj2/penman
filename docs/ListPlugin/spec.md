# ListPlugin Specification

## Options
None

## Internal Execution Rules
1. Uses `editor.ui.registry.addButton` to register UI buttons for `bullist` and `numlist`.
2. Registers custom commands `insertUnorderedList` and `insertOrderedList` to manipulate the DOM directly using standard DOM APIs instead of `document.execCommand`.
3. Handles wrapping selected blocks (e.g. `<p>`) in list items (`<li>`) and a list container (`<ul>` or `<ol>`).
4. Handles unwrapping lists if the cursor is already inside a list of the same type.

## Side Effects
- Binds 2 standard list buttons to the toolbar registry.
- Registers 2 custom commands to `CommandManager`.
