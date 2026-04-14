# BlockTypePlugin Examples

## Example 1: Transform Paragraph to Heading 1
- **Input**: Cursor is inside `<p>Hello World</p>`. User selects `Heading 1` from the BlockType dropdown.
- **Output OR behavioral result**: `<p>Hello World</p>` becomes `<h1>Hello World</h1>`.
- **Explanation of internal behavior**: The plugin executes `document.execCommand('formatBlock', false, 'h1')`. The browser replaces the paragraph tag with an h1 tag, maintaining the inner text node intact.

## Example 2: Transform Blockquote to Paragraph
- **Input**: Cursor is inside `<blockquote>This is a quote</blockquote>`. User selects `Paragraph` from dropdown.
- **Output OR behavioral result**: `<blockquote>This is a quote</blockquote>` becomes `<p>This is a quote</p>`.
- **Explanation of internal behavior**: The plugin executes `document.execCommand('formatBlock', false, 'p')`. The native engine unwraps the blockquote and wraps the text in a standard paragraph.

## Example 3: Edge Case Offset 0 Transformation
- **Input**: The cursor is collapsed exactly at index 0 of `<h2>Title</h2>` (before the letter 'T'). User selects `Heading 2`.
- **Output OR behavioral result**: No DOM change occurs visually if it is already an `h2`. If changed to `h3`, it becomes `<h3>Title</h3>`.
- **Explanation of internal behavior**: Even with a collapsed cursor (no text selected), the native `formatBlock` acts upon the closest parent block element boundaries identified by the cursor offset point.
