# BlockTypePlugin

Converts the current block (paragraph / heading / blockquote / callout) using a searchable dropdown that previews each block type in its actual visual style.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['blocktype'],
  toolbar: 'blocktype'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `SET_BLOCK_TYPE` | Receives a `block` descriptor `{ name, cmd, class?, i18nKey?, optionStyle? }`. |
| Dropdown | `blocktype` | Searchable list of available block types. Renders each option in its real tag (e.g. H1 in 2em bold, blockquote indented) so users see what they're getting. |
| i18n namespace | `plugins.blockType` | Persian + English shipped. |

## Default block types

Configurable via the `blockTypes` init option. Defaults: `Paragraph`, `Heading 1..6`, `Blockquote`, plus 4 colored callouts (`Success`, `Info`, `Warning`, `Danger`).

```js
penman.init({
  selector: '#editor',
  plugins: ['blocktype'],
  blockTypes: [
    { name: 'Paragraph', cmd: 'p',  i18nKey: 'plugins.blockType.paragraph' },
    { name: 'Heading 1', cmd: 'h1', i18nKey: 'plugins.blockType.heading1' },
    { name: 'Quote',     cmd: 'blockquote', i18nKey: 'plugins.blockType.blockquote' },
    { name: 'Success',   cmd: 'div', class: 'green-block', optionStyle: { color: '#166534', background: '#dcfce7' } }
  ]
});
```

## How it works

The dropdown's `renderDropdownContent` builds a search box plus a list of rendered preview elements — each preview is a real `<h1>`, `<blockquote>`, etc. so the option visually represents the outcome. Selecting an option calls `editor.execCommand('SET_BLOCK_TYPE', block)`, which:

1. Snapshots history.
2. Replaces the current block element with the target tag (preserving inline content).
3. Strips other block-type classes (prevents class pollution between switches), then adds the new block's class if any.

The dropdown label live-updates on `selectionChange` to show the active block type.

## Boundaries

- Does NOT apply inline formatting (bold/italic — see `FormatPlugin`).
- Does NOT handle list creation (see `ListPlugin`).
- Does NOT allow custom block tags outside the configured `blockTypes` array.
