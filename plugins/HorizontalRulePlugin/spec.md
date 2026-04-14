# HorizontalRulePlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Registers `INSERT_HORIZONTAL_RULE` command.
2. Identifies if the cursor is within a block element (`p`, `h1`-`h6`, `blockquote`).
3. If inside a block, executes native `document.execCommand('insertHorizontalRule')` to handle splitting.
4. If NOT in a block, uses raw DOM Manipulation (`range.insertNode()`) to force insertion.
5. If the newly inserted `<hr>` is the absolute `lastChild` of `editableArea`, dynamically appends a `<p><br></p>` block to allow cursor continuity.

## State Changes
- Mutates DOM structure by injecting `<hr>` tag.

## Side Effects
- May split current active paragraph block into two separate paragraphs natively.
- Repositions native selection cursor immediately after the inserted rule.

## Edge Cases
- **End of Document**: Ensures `<p><br></p>` gets appended natively to prevent cursor locking.
- **Nested elements**: Utilizes `execCommand` block split handling.

## Error Conditions
- Fails silently if no selection exists (`sel.rangeCount === 0`).
