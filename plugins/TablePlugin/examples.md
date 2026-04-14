# TablePlugin Examples

## Example 1: Insert 3x3 Table
- **Input**: User selects 3 rows and 3 columns in the table dropdown UI.
- **Output OR behavioral result**: A nested `<table>` with 3 `<tr>` and 3 `<td>` per row is appended natively.
- **Explanation of internal behavior**: Executes `editor.commands.execute('INSERT_TABLE', { rows: 3, cols: 3 })`. It iterates concatenating HTML strings generating unique random IDs (e.g. `data-cell-id`) for the grid tracking natively.

## Example 2: Update Table Properties (Width)
- **Input**: User opens properties, inputs Width: `50%`, Submits.
- **Output OR behavioral result**: Table wrapper reflects `<table style="... width: 50%;">`.
- **Explanation of internal behavior**: Modal submission aggregates parameters formatting into `{ properties: { width: '50%' } }`. Passes cleanly to `SET_TABLE_PROPERTIES`. Transaction explicitly updates `tableNode.style.width` natively pushing single snapshot.

## Example 3: Fallback Alignment Property
- **Input**: User opens properties modal on a table with NO alignment explicit CSS.
- **Output OR behavioral result**: Modal reads "Left" as active state dynamically.
- **Explanation of internal behavior**: Evaluation logic uses: `currentAlign = escapeHTML(tableNode.style.marginLeft === 'auto' ? (tableNode.style.marginRight === 'auto' ? 'center' : 'right') : 'left')`. Without auto margins, it gracefully defaults to 'left' for UI presentation natively.
