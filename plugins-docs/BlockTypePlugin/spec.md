# BlockTypePlugin Specification

## Options

### `blockTypes`
- **Type**: `Array<{name: string, cmd: string}>`
- **Default value**: `[{ name: 'Paragraph', cmd: 'p' }, { name: 'Heading 1', cmd: 'h1' }, { name: 'Heading 2', cmd: 'h2' }, { name: 'Heading 3', cmd: 'h3' }, { name: 'Heading 4', cmd: 'h4' }, { name: 'Heading 5', cmd: 'h5' }, { name: 'Heading 6', cmd: 'h6' }, { name: 'Blockquote', cmd: 'blockquote' }]`
- **Required/Optional**: Optional
- **Validation rules**: Must be an array of objects. Each object must have a `name` string and a valid HTML block `cmd` string (e.g. `p`, `h1`, `blockquote`).
- **Failure behavior**: If undefined, defaults to the default array list. If invalid format, dropdown rendering throws an exception.

## Internal Execution Rules
1. Subscribes to the `selectionChange` event globally.
2. Identifies the active tag by traversing the DOM up from the cursor to `editor.editableArea`.
3. Populates a searchable list of `blockTypes` on `onOpen`.
4. Saves selection state via `editor.selection.save()` upon opening dropdown.
5. Executes changes via `document.execCommand('formatBlock', false, block.cmd)`.

## State Changes
- Updates text content of `.penman-btn-blocktype` UI button based on the cursor's current block container.
- Alters DOM by converting current block level wrapper into the specified `cmd` tag.

## Side Effects
- Mutates the DOM structure natively.
- Forces focus change to maintain native selection when navigating the list (managed via `mousedown.preventDefault()`).

## Edge Cases
- **Collapsed selection at offset 0**: Transforms the entire parent block element.
- **Selection spanning multiple blocks**: Browser native `formatBlock` handles conversion of multiple selected blocks.

## Error Conditions
- If the editor selection is completely lost and `formatBlock` executes, nothing happens or browser throws native DOM Exception.
