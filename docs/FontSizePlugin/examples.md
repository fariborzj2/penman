# FontSizePlugin Examples

## Example 1: Apply Font Size to Plain Text
- **Input**: Editor contains `<p>Hello world</p>`. User highlights "Hello" and selects `24px`.
- **Output OR behavioral result**: Result is `<p><span style="font-size: 24px;">Hello</span> world</p>`.
- **Explanation of internal behavior**: Executes `document.execCommand('fontSize', false, '7')` generating `<font size="7">Hello</font>`. The 3rd pass iterates finding `font[size="7"]`, creating a span with `style.fontSize = '24px'`, appending children, and replacing the font tag.

## Example 2: Override Existing Font Size
- **Input**: Editor contains `<p><span style="font-size: 12px;">Small</span></p>`. User highlights "Small" and selects `32px`.
- **Output OR behavioral result**: Result is `<p><span style="font-size: 32px;">Small</span></p>`.
- **Explanation of internal behavior**: Pass 1 locates the `12px` span intersecting the selection. It executes `span.style.fontSize = ''` (and removes the style attribute if empty). Pass 2 applies `fontSize 7`. Pass 3 converts to the new `32px` span, avoiding nested sizes.

## Example 3: Apply with Collapsed Cursor
- **Input**: User places cursor between words (collapsed selection) and selects `18px`.
- **Output OR behavioral result**: No execution happens.
- **Explanation of internal behavior**: The `execute` command immediately returns `undefined` if `sel.isCollapsed` is true, enforcing the strict execution rule.
