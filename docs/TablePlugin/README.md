# TablePlugin

The largest plugin: full table support — insert via hover-grid picker, edit cells via floating menu, row/column add/remove, merge/split with rollback, properties modal (width/border/alignment/direction).

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['table'],
  toolbar: 'table'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Commands | `INSERT_TABLE`, `SELECT_TABLE`, `OPEN_TABLE_PROPERTIES_MODAL`, `MERGE_CELLS`, `SPLIT_CELL`, `ADD_ROW`, `REMOVE_ROW`, `ADD_COLUMN`, `REMOVE_COLUMN`, `SET_TABLE_PROPERTIES`, `SET_CELL_PROPERTY` | All wrapped in `TableTransaction` so a failed mutation rolls back atomically. |
| Dropdown | `table` | Hover-grid picker (1×1 to 10×10) + cascading submenus for Cell / Row / Column / Table actions. |
| i18n namespace | `plugins.table` | 40+ keys. |
| Icons | `table`, `selecttable` (plus inline SVGs for menu items) | |

## INSERT_TABLE output

A newly inserted N×M table:

```html
<table data-table-id="t-xxx">
  <thead>
    <tr><th data-cell-id="c-..."><p><br></p></th>...</tr>
  </thead>
  <tbody>
    <tr><td data-cell-id="c-..."><p><br></p></td>...</tr>
    ...
  </tbody>
</table>
```

No inline border/style — borders come from `var(--pmc-border)` in `penman-content.css` and adapt to dark mode. First row is always `<thead><th>` (matches what the sanitizer produces on paste, so insert and paste are visually identical).

## Dropdown UX

The toolbar dropdown is built by `TableMenu.js`. Layout:

- **Insert Table** section — 10×10 grid; hover highlights cells, click commits dimensions.
- **Cell** flyout — Merge, Split.
- **Row** flyout — Insert above, Insert below, Delete row.
- **Column** flyout — Insert left, Insert right, Delete column.
- **Table** flyout — Properties, Select table, Delete table.

Each parent button opens its submenu on hover (or click for touch/keyboard). When the caret is outside a table, contextual actions are disabled with a tooltip explaining why.

## Cell selection

`TableSelectionManager` tracks multi-cell selection: drag from one cell to another, every cell in the rectangular range gets `penman-cell-selected`. Merge / Split / SET_CELL_PROPERTY operate on the active selection. Selection survives caret moves until a click elsewhere clears it.

## Merge semantics

When merging cells that contain only `<p><br></p>` (visually empty), the anchor cell is normalized to exactly one `<p><br></p>` — no stacked blank paragraphs. When at least one cell has real content, only that content is kept and any empty siblings are dropped.

A `data-merge-descriptor` JSON attribute records absorbed cells so `SPLIT_CELL` can reverse the operation losslessly.

## Properties modal

The full modal: width, border, border color, cell padding, cell spacing, direction, alignment. Built on `FormModal` with consistent field styling. Each property writes the matching HTML attribute on `<table>` rather than inline style (sanitizer-friendly, easier to override with CSS).

## Boundaries

- Does NOT do column/row resize via drag handles.
- Does NOT support nested tables (sanitizer permits them but transactions only operate on the outermost table).
