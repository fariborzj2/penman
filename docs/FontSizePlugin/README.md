# FontSizePlugin

## Exact purpose of the plugin
Applies explicit inline CSS font-size styles to the current text selection.

## System role
Registers the `SET_FONT_SIZE` custom command and a `fontsize` UI dropdown menu. The command uses a workaround with `document.execCommand('fontSize', false, '7')` followed by a DOM traversal to replace the legacy `<font>` tags with `<span>` tags containing the actual `font-size` CSS property. Also handles cleaning up pre-existing `font-size` spans.

## Clear boundary of what it DOES NOT do
- Does NOT apply block-level sizing.
- Does NOT use pre-defined CSS classes for font sizes; uses explicit inline styles (`style="font-size: X"`).
- Does NOT alter the font family.

## Dependencies
- `editor.ui.registry` (UIManager)
- `editor.commands` (CommandManager)
- `editor.selection` (SelectionManager)
