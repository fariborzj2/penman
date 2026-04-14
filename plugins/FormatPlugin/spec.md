# FormatPlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Loops through `['bold', 'italic', 'underline']` formats.
2. Registers a button via `editor.ui.registry.addButton` for each.
3. Executes formats using `document.execCommand(format)`.

## State Changes
- Toggles standard formatting tags (`<b>`/`<strong>`, `<i>`/`<em>`, `<u>`) in the DOM based on browser interpretation.

## Side Effects
- Relies completely on native browser engine side effects for splitting, merging, and wrapping text nodes.

## Edge Cases
- **No text selected**: Browser behavior toggles the formatting state for the next typed characters.
- **Overlapping formats**: Handled automatically by the browser's native API.

## Error Conditions
- Fails implicitly if browser lacks `execCommand` support (though universally supported for these 3).
