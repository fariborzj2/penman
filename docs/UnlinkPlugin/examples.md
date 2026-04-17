# UnlinkPlugin Examples

## Example 1: Standard Highlight Unlink
- **Input**: User highlights `Here is a <a href="x">link</a>`. User clicks Unlink.
- **Output OR behavioral result**: Result is `Here is a link`.
- **Explanation of internal behavior**: Checks `queryState` natively. Because the selection is NOT collapsed, it triggers `document.execCommand('unlink')` perfectly unwrapping the node.

## Example 2: Collapsed Cursor Fallback
- **Input**: User places collapsed cursor perfectly between 'l' and 'i' of `<a href="x">link</a>`. User clicks Unlink.
- **Output OR behavioral result**: Result is `link`.
- **Explanation of internal behavior**: `sel.isCollapsed` is intrinsically true. Native `unlink` fails contextually. The fallback traverses `range.startContainer.parentNode` matching tag `a`. Executes manual unwrapping by moving children to `parent` natively and destructing the node.

## Example 3: Nested Formats Inside Link
- **Input**: User unlinks `<a href="x"><b>bold</b></a>`.
- **Output OR behavioral result**: Result is `<b>bold</b>`.
- **Explanation of internal behavior**: Unwrapping algorithm targets exclusively the matched `linkNode`. It transfers `linkNode.firstChild` (which is the `<b>` tag) intact to the parent container ensuring inline styles survive cleanly.
