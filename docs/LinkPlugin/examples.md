# LinkPlugin Examples

## Example 1: Basic Link Insertion
- **Input**: User highlights "Google". Opens Link Modal, inputs `https://google.com`, submits.
- **Output OR behavioral result**: `<a href="https://google.com">Google</a>`.
- **Explanation of internal behavior**: `editor.selection.save()` stores bounds. `editor.selection.restore()` places cursor back. Modal output evaluates `safeUrl` and constructs the HTML string, deploying via `editor.insertContent`.

## Example 2: Missing Display Text
- **Input**: User selects nothing. Opens modal, inputs URL `https://github.com`, leaves Text blank, submits.
- **Output OR behavioral result**: `<a href="https://github.com">https://github.com</a>`.
- **Explanation of internal behavior**: Modal logic validates text parameter: `const safeText = data.text ? escapeHtmlAttr(data.text) : safeUrl`. It gracefully falls back to URL for display.

## Example 3: Escaping Malicious Input
- **Input**: User attempts to inject `"><script>alert()</script>` into the Target field.
- **Output OR behavioral result**: `<a href="..." target="&quot;&gt;&lt;script&gt;alert()&lt;/script&gt;">...</a>`.
- **Explanation of internal behavior**: `escapeHtmlAttr()` sanitizes parameters via strict regex replacement before insertion preventing attribute breakout vulnerabilities.
## Example 4: Standard Highlight Unlink
- **Input**: User highlights `Here is a <a href="x">link</a>`. User clicks Unlink.
- **Output OR behavioral result**: Result is `Here is a link`.
- **Explanation of internal behavior**: Checks `queryState` natively. Because the selection is NOT collapsed, it triggers `document.execCommand('unlink')` perfectly unwrapping the node.

## Example 5: Collapsed Cursor Fallback
- **Input**: User places collapsed cursor perfectly between 'l' and 'i' of `<a href="x">link</a>`. User clicks Unlink.
- **Output OR behavioral result**: Result is `link`.
- **Explanation of internal behavior**: `sel.isCollapsed` is intrinsically true. Native `unlink` fails contextually. The fallback traverses `range.startContainer.parentNode` matching tag `a`. Executes manual unwrapping by moving children to `parent` natively and destructing the node.

## Example 6: Nested Formats Inside Link
- **Input**: User unlinks `<a href="x"><b>bold</b></a>`.
- **Output OR behavioral result**: Result is `<b>bold</b>`.
- **Explanation of internal behavior**: Unwrapping algorithm targets exclusively the matched `linkNode`. It transfers `linkNode.firstChild` (which is the `<b>` tag) intact to the parent container ensuring inline styles survive cleanly.
