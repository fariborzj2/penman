# FontSizePlugin Specification

## Options

### `fontSizes`
- **Type**: `Array<string>`
- **Default value**: `['12px', '14px', '16px', '18px', '24px', '32px']`
- **Required/Optional**: Optional
- **Validation rules**: Must be an array of CSS-compatible size strings.
- **Failure behavior**: If undefined, defaults to the default list.

## Internal Execution Rules
1. Registers `SET_FONT_SIZE` command.
2. Checks queryState via `window.getComputedStyle(node).fontSize` to update the dropdown label.
3. Execution implementation uses a 3-pass system:
    - Pass 1: TreeWalks the active selection to locate pre-existing nested `<span>` tags with `fontSize` properties and strips their styles to prevent nesting.
    - Pass 2: Uses `document.execCommand('fontSize', false, '7')` to apply legacy `<font size="7">` elements to the selection.
    - Pass 3: Iterates through inserted `<font size="7">` nodes, recreates them as `<span>` tags with explicit `style="font-size: X"`, and replaces the `<font>` wrappers.

## State Changes
- Mutates inline styles (`fontSize`).
- Updates dropdown label text to reflect the current active font size dynamically based on selection.

## Side Effects
- Cleans up empty style attributes on legacy nodes if present.

## Edge Cases
- **Collapsed selection**: Aborts execution strictly if `sel.isCollapsed` is true (does not apply font sizes without selected text).
- **Selection spanning completely within an existing span**: Checks if the entire range is inside an existing span and modifies the container directly instead of wrapping new elements.

## Error Conditions
- Fails silently if `sel.rangeCount === 0`.
