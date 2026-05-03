# MarkdownPlugin

## Exact purpose of the plugin
Provides Markdown-like syntax expansion as the user types (e.g., `# ` for headings, `**text**` for bold, `* ` for lists).

## System role
It listens to the editor's `keyup` event to detect Markdown patterns and transforms the text into the corresponding HTML blocks or inline formats using `editor.commands.execute`.

## Clear boundary of what it DOES NOT do
- Does not convert existing HTML content to Markdown.
- Automatically intercepts plain-text pastes that contain Markdown syntax, converting them directly to rich HTML elements.
- Does not act as a full Markdown parser; it only supports inline expansions on typing and on plain-text paste events.

## Dependencies
- `editor.commands` (CommandManager)
- `editor.selection` (SelectionManager)
