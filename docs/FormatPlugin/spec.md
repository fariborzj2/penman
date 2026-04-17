# FormatPlugin Specification

## Options
None

## Internal Execution Rules
1. Iterates over the array `['bold', 'italic', 'underline']`.
2. Uses `editor.ui.registry.addButton` to register UI buttons for each format.
3. Delegates action handling to `editor.execCommand(format)`.

## Side Effects
- Binds 3 standard inline formatting buttons to the toolbar registry.
