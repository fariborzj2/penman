# FormatPlugin Specification

## Options
None

## Internal Execution Rules
1. Iterates over the array `['bold', 'italic', 'underline', 'strikethrough']`.
2. Uses `editor.ui.registry.addButton` to register UI buttons for each format.
3. Delegates action handling to `editor.execCommand(format)`.

## Side Effects
- Binds 4 standard inline formatting buttons to the toolbar registry.
