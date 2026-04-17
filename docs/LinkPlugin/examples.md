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
