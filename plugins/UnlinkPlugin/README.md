# UnlinkPlugin

## Exact purpose of the plugin
Removes hyperlinks (`<a>` tags) from the current cursor position or text selection.

## System role
Registers the `REMOVE_LINK` command and an `unlink` UI button. It uses native `document.execCommand('unlink')` but additionally provides a custom manual unwrapping fallback if the cursor is collapsed perfectly inside an anchor tag (which native commands often fail to handle).

## Clear boundary of what it DOES NOT do
- Does NOT delete the text content inside the link.
- Does NOT remove formatting other than the anchor wrapper.

## Dependencies
- `editor.commands` (CommandManager)
- `editor.ui.registry` (UIManager)
