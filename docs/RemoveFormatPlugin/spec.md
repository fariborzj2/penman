# RemoveFormatPlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Registers `CLEAR_FORMATTING` command.
2. Executes standard `document.execCommand('removeFormat')`.
3. Instantiates `document.createTreeWalker` to identify hardcoded `inlineTags` (`strong`, `em`, `b`, `i`, `u`, `span`, `a`, `mark`, `s`, `strike`).
4. Iterates through matching intersected nodes.
5. Manually unwraps residual formats using DOM API (`insertBefore` then `removeChild`).

## State Changes
- Tears down inline element wrappers.

## Side Effects
- Physically destructs inline elements recursively within range bounds.
- Normalizes underlying DOM text nodes implicitly after unwrapping.

## Edge Cases
- **Collapsed selection**: Fails early returning undefined if `sel.isCollapsed` is true.
- **Node removal state**: Checks `node.parentNode` dynamically because `execCommand` may have already successfully deleted the target node.

## Error Conditions
- Exits early if no valid selection ranges exist natively.
