# ListPlugin Examples

## Example 1: Ordered List Creation
- **Input**: Cursor is on `<p>Step 1</p>`. User clicks Numbered List button.
- **Output OR behavioral result**: HTML becomes `<ol><li>Step 1</li></ol>`.
- **Explanation of internal behavior**: Triggers `document.execCommand('insertOrderedList')`. The browser unwraps the `<p>` and restructures it into standard `ol/li` configuration natively.

## Example 2: List Breakout (Double Enter)
- **Input**: Cursor is inside `<ol><li>Item 1</li><li>|</li></ol>` (an empty list item). User presses Enter.
- **Output OR behavioral result**: HTML becomes `<ol><li>Item 1</li></ol><p><br></p>`.
- **Explanation of internal behavior**: (Core feature mapped by plugin context): The browser natively splits the list, destroying the empty `li` and converting the new block element back to the default `defaultParagraphSeparator` (`p`).

## Example 3: Unordered List Toggle
- **Input**: Cursor is on `<ol><li>A</li></ol>`. User clicks Bullet List button.
- **Output OR behavioral result**: HTML becomes `<ul><li>A</li></ul>`.
- **Explanation of internal behavior**: `insertUnorderedList` detects the active ordered list parent block and mutually toggles the wrapper tag natively without affecting the `li` child.
