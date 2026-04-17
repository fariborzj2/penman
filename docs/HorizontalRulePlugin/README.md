# HorizontalRulePlugin

## Exact purpose of the plugin
Inserts a horizontal rule (`<hr>`) element at the current cursor position.

## System role
Registers the `INSERT_HORIZONTAL_RULE` command and an `hr` UI button. Handles the logic of splitting the current block-level element if necessary and ensures a `<p><br></p>` exists after the inserted `<hr>` if it is placed at the end of the editor content.

## Clear boundary of what it DOES NOT do
- Does NOT allow configuration of the `<hr>` styling, thickness, or color via UI.
- Does NOT embed the `<hr>` inside paragraph tags (strictly splits blocks).

## Dependencies
- `editor.commands` (CommandManager)
- `editor.ui.registry` (UIManager)
