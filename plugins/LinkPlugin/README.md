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
