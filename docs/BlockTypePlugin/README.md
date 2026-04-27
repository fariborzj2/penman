# BlockTypePlugin

## Exact purpose of the plugin
Allows users to change the block-level HTML tag of the currently selected text (e.g., Paragraph, Headings 1-6, Blockquote).

## System role
Registers a searchable `blocktype` UI dropdown menu. It listens to editor `selectionChange` events to dynamically update the active block type displayed in the toolbar based on cursor position. It uses `document.execCommand('formatBlock')` to apply changes.

## Clear boundary of what it DOES NOT do
- Does NOT apply inline formatting (e.g., bold, italic).
- Does NOT handle list creation or mutation.
- Does NOT allow custom block tags outside of the configured `blockTypes` array.

## Default Block Types
The plugin includes a set of pre-defined block types, including standard typography (Paragraph, Heading 1-6, Blockquote) and styled informational blocks:
- **Success**: Green styled block for positive feedback.
- **Info**: Blue styled block for general information.
- **Warning**: Orange styled block for cautionary notes.
- **Danger**: Red styled block for critical errors or warnings.

## Dependencies
- `editor.ui.registry` (UIManager)
- `editor.options.blockTypes`
- `editor.selection` (SelectionManager)
