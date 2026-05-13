# BlockTypePlugin

## Exact purpose of the plugin
Allows users to change the block-level HTML tag of the currently selected text (e.g., Paragraph, Headings 1-6, Blockquote). Also supports applying optional CSS classes and inline styles to blocks when configured via `blockTypes`.

## System role
Registers a searchable `blocktype` UI dropdown menu. It listens to editor `selectionChange` events to dynamically update the active block type displayed in the toolbar based on cursor position. It uses `document.execCommand('formatBlock')` to apply block tag changes, then applies any configured CSS class via `classList`.

## Clear boundary of what it DOES NOT do
- Does NOT apply inline formatting (e.g., bold, italic).
- Does NOT handle list creation or mutation.
- Does NOT allow custom block tags outside of the configured `blockTypes` array.
- Does NOT apply `style` attributes directly to blocks (only CSS classes from the `class` field in `blockTypes`).

## Applying CSS classes
When a `blockTypes` entry includes a `class` property, the plugin applies that CSS class to the
formatted block element via `block.classList.add(blockDef.class)`. Classes from other `blockTypes`
entries are removed before the new class is applied, preventing style pollution.

Example:
```javascript
blockTypes: [
  { name: 'Warning', cmd: 'div', class: 'warning-block', optionStyle: { color: 'red' } }
]
```
Selecting "Warning" will produce `<div class="warning-block">...</div>`.

## Dependencies
- `editor.ui.registry` (UIManager)
- `editor.options.blockTypes`
