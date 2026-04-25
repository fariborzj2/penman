# LinkPlugin

## Exact purpose of the plugin
Inserts and configures hyperlinks (`<a>` tags) with target and rel attributes.

## System role
Registers a `link` UI button that opens a custom modal. It saves the editor's text selection before opening the modal, collects URL, display text, target, and rel configuration, and inserts the generated HTML anchor tag via `editor.insertContent`.

## Clear boundary of what it DOES NOT do
- Does NOT automatically linkify URLs typed in plain text.
- Does NOT validate the liveness or safety of the URL endpoint.
- Does NOT remove links (handled by UnlinkPlugin).

## Dependencies
- `editor.ui.registry` (UIManager)
- `editor.ui.createModal` (UIManager)
- `editor.selection` (SelectionManager)
## Exact purpose of the unlink functionality
Removes hyperlinks (`<a>` tags) from the current cursor position or text selection.

## System role for unlink
Registers the `REMOVE_LINK` command and an `unlink` UI button. It uses native `document.execCommand('unlink')` but additionally provides a custom manual unwrapping fallback if the cursor is collapsed perfectly inside an anchor tag (which native commands often fail to handle).

## Clear boundary of what unlink DOES NOT do
- Does NOT delete the text content inside the link.
- Does NOT remove formatting other than the anchor wrapper.

## Dependencies for unlink
- `editor.commands` (CommandManager)
- `editor.ui.registry` (UIManager)
