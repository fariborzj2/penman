# RemoveFormatPlugin

## Exact purpose of the plugin
Clears all inline text formatting from the currently selected text.

## System role
Registers the `CLEAR_FORMATTING` command and a `removeformat` UI button. Because native `removeFormat` is insufficient, this plugin implements a custom DOM `TreeWalker` to manually unwrap residual inline tags (`strong`, `em`, `b`, `i`, `u`, `span`, `a`, `mark`, `s`, `strike`) within the selection boundary.

## Clear boundary of what it DOES NOT do
- Does NOT remove block-level formats (e.g., it will not convert an `<h1>` back to a `<p>`).
- Does NOT remove structural elements like tables, lists, or images.

## Dependencies
- `editor.commands` (CommandManager)
- `editor.ui.registry` (UIManager)
