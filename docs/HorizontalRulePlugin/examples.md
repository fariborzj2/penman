# HorizontalRulePlugin Examples

## Example 1: Splitting a Paragraph
- **Input**: Cursor is in `<p>Top|Bottom</p>`. User clicks HR.
- **Output OR behavioral result**: Result is `<p>Top</p><hr><p>Bottom</p>`.
- **Explanation of internal behavior**: Internal lookup resolves the `p` as a block node and successfully delegates the block splitting behavior to `execCommand('insertHorizontalRule')`.

## Example 2: End of Document Insertion
- **Input**: Cursor is at the end of the last `<p>End</p>`. User clicks HR.
- **Output OR behavioral result**: Result is `<p>End</p><hr><p><br></p>`.
- **Explanation of internal behavior**: The insertion places `<hr>` as the last child. The edge-case handler triggers: `if (lastChild.tagName === 'hr')`, creating a `<p><br></p>` and moving the selection range inside it natively.

## Example 3: Fallback Insertion (Non-block)
- **Input**: Cursor is somehow forced into a non-block layout context natively without a wrapping tag.
- **Output OR behavioral result**: `<hr>` is inserted inline and selection is collapsed after it.
- **Explanation of internal behavior**: Evaluates `blockNode` as null. Runs the fallback `range.insertNode(hr)` and strictly sets range bounds `setStartAfter(hr)`.
