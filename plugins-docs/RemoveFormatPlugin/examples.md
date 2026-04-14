# RemoveFormatPlugin Examples

## Example 1: Strip Bold and Italic
- **Input**: Selection spans `<b><i>Important</i></b> text`. User clicks Clear Formatting.
- **Output OR behavioral result**: Text becomes `Important text`.
- **Explanation of internal behavior**: Native `removeFormat` handles standard tags. The custom `TreeWalker` pass confirms no residual nodes exist.

## Example 2: Strip Custom Font Size Span
- **Input**: Selection covers `<span style="font-size: 24px;">Large</span>`. User clicks Clear Formatting.
- **Output OR behavioral result**: Text becomes `Large`.
- **Explanation of internal behavior**: Native `removeFormat` fails to remove the span. The `TreeWalker` pass explicitly identifies `span` as an `inlineTags` target, intercepts it, relocates `node.firstChild` to parent, and calls `removeChild(node)`.

## Example 3: Preserve Block Tags
- **Input**: User selects text inside `<h1>Title</h1>` and clicks Clear Formatting.
- **Output OR behavioral result**: HTML remains `<h1>Title</h1>`.
- **Explanation of internal behavior**: `TreeWalker` explicitly filters against `inlineTags`. `h1` is not in the array and therefore is ignored by the unwrapping algorithm.
