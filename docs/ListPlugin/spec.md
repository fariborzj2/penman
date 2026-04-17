# ListPlugin Specification

## Options
None

## Internal Execution Rules
1. Uses `editor.ui.registry.addButton` to register UI buttons for `bullist` and `numlist`.
2. Delegates action handling to `editor.execCommand('insertUnorderedList')` and `editor.execCommand('insertOrderedList')`.

## Side Effects
- Binds 2 standard list buttons to the toolbar registry.
