# ListPlugin

## Exact purpose of the plugin
Toggles unordered (bullet) and ordered (numbered) lists for the current selection.

## System role
Registers UI buttons (`bullist`, `numlist`) in the toolbar registry that trigger native `document.execCommand('insertUnorderedList')` and `insertOrderedList`.

## Clear boundary of what it DOES NOT do
- Does NOT manage complex multi-level list styling (e.g., Roman numerals vs alphabetical).
- Does NOT manually construct list DOM elements.
- Does NOT handle custom bullet icons.

## Dependencies
- `editor.ui.registry` (UIManager)
