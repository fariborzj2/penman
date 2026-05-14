# FormatPlugin

The inline formatting plugin — bold, italic, underline, strikethrough, superscript, subscript. Registers ONE button per format and the matching command. Each command toggles between `<strong>`/`<em>`/`<u>`/`<s>`/`<sup>`/`<sub>` (legacy `<b>`/`<i>` are normalized into modern tags).

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['format'],
  toolbar: 'bold italic underline strikethrough superscript subscript'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Commands | `bold` `italic` `underline` `strikethrough` `superscript` `subscript` | Each is a toggle (queryState returns the current active state). |
| Buttons | same names | Toolbar icons with `aria-pressed` reflecting state. |
| Icons | `bold` `italic` `underline` `strikethrough` `superscript` `subscript` | |

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/⌘+B | Bold |
| Ctrl/⌘+I | Italic |
| Ctrl/⌘+U | Underline |

(Other formats can be invoked via toolbar only by default.)

## Tag normalization

When existing HTML uses legacy tags (`<b>`, `<i>`, `<strike>`), the plugin's `normalizeInline` pass replaces them with the modern semantic equivalents (`<strong>`, `<em>`, `<s>`) on each format operation. This keeps the document consistent regardless of paste source.

## Boundaries

- Does NOT manage block-level formatting (see `BlockTypePlugin`).
- Does NOT do font family / size / color (see `FontSizePlugin`, `ColorPlugin`).
