# FormatPlugin Examples

## Example 1: Bold Text
- **Input**: User selects text "Warning" and clicks Bold.
- **Output OR behavioral result**: Text becomes `<b>Warning</b>` (or `<strong>` depending on browser).
- **Explanation of internal behavior**: Dispatches `document.execCommand('bold')` natively.

## Example 2: Overlapping Formats
- **Input**: User selects text "Urgent", clicks Bold, then clicks Italic.
- **Output OR behavioral result**: Text becomes `<b><i>Urgent</i></b>`.
- **Explanation of internal behavior**: The native engine handles nested node creation securely by evaluating current range state and wrapping accordingly.

## Example 3: Un-formatting (Toggle)
- **Input**: User selects active bold text `<b>Test</b>` and clicks Bold.
- **Output OR behavioral result**: Text reverts to `Test`.
- **Explanation of internal behavior**: `execCommand` identifies the active `b` wrapper relative to the selection range and unwraps it.
