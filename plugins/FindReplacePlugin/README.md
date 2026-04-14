# FindReplacePlugin

## Exact purpose of the plugin
Provides text search and replace capabilities within the editor's editable area, including options for match case, ignore diacritics (RTL), and whole words.

## System role
Instantiates a `TextMapper` to build a text-to-node offset mapping via a `TreeWalker`. It provides a Find/Replace Modal UI, manages search state (`currentIndex`, `results`), highlights matches natively using `Selection` ranges, and mutates text nodes or native DOM elements for replacements.

## Clear boundary of what it DOES NOT do
- Does NOT search within HTML attributes or tag names.
- Does NOT support Regular Expression (RegEx) searches.
- Does NOT search outside of `editor.editableArea`.

## Dependencies
- `editor.ui.createModal` (UIManager)
- `editor.history` (HistoryManager)
- `editor.selection` (SelectionManager)
- `TextMapper` (internal module class)
