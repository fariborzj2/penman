# TablePlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Registers `INSERT_TABLE` command mapping rows/cols to HTML strings appended to DOM.
2. Initializes `TableSelectionManager` instance.
3. Registers `OPEN_TABLE_PROPERTIES_MODAL` command to launch UI configuring Table layout.
4. Dynamically evaluates `currentAlign`, `currentDir`, `currentWidth`, `currentBorder`, `currentBorderColor`, `currentCellPadding`, and `currentCellSpacing`.
5. Re-applies parameters natively using `SET_TABLE_PROPERTIES` inside `TableTransaction`.
6. Executes internal validations mapping strict attributes natively to table configurations.

## State Changes
- Invokes `SET_TABLE_PROPERTIES` modifying nested `table` styles and attributes natively.
- Mutates inline CSS parameters.

## Side Effects
- Escapes arbitrary strings dynamically via `escapeHTML()`.
- Captures snapshots natively wrapping changes inside a transactional buffer boundary.

## Edge Cases
- **Missing explicitly defined attributes**: Resolves dynamically utilizing internal string fallback logic for empty variables.
- **Direction parameter**: Defaults to default logic explicitly handling `"ltr"` and `"rtl"` states natively.

## Error Conditions
- Fails cleanly returning immediately if `selectionManager.activeTableNode` is intrinsically false/null natively.
