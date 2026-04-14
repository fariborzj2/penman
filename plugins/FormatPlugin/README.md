# FormatPlugin

## Exact purpose of the plugin
Applies basic inline text formatting (bold, italic, underline) to the current selection.

## System role
Registers standard UI buttons (`bold`, `italic`, `underline`) to the toolbar registry. These buttons trigger native `document.execCommand` formatting operations.

## Clear boundary of what it DOES NOT do
- Does NOT handle advanced inline styles like strikethrough or highlight.
- Does NOT provide dropdowns or modal UIs.
- Does NOT implement custom DOM traversal for formatting; relies entirely on browser-native implementations.

## Dependencies
- `editor.ui.registry` (UIManager)
