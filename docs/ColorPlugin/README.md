# ColorPlugin

Text and background color pickers, each backed by `src/ui/ColorPicker.js` (palette + hex input). Two independent dropdowns: text color (foreground) and highlight (background).

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['color'],
  toolbar: 'textcolor highlight'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `SET_TEXT_COLOR` | Wraps the selection with `<span style="color:…">`. |
| Command | `SET_HIGHLIGHT_COLOR` | Same, but `background-color`. Pass `'transparent'` to clear. |
| Dropdown | `textcolor` | Opens the picker for foreground color. |
| Dropdown | `highlight` | Opens the picker for background color. |
| i18n namespace | `plugins.color` | |
| Icons | `textcolor`, `highlight` | |

## ColorPicker UI

- Hex input accepts `#RGB`, `#RRGGBB`, or the literal string `transparent`.
- 70+ swatch palette in 7 rows. The transparent swatch renders as a checkered pattern with a red strike.
- Theme-aware — dark mode inverts swatch borders and the checker pattern so swatches remain visible on dark surfaces.
- Picker uses `_mergeNestedSpans` after each apply to coalesce consecutive `<span style="color:…">` siblings, preventing span pollution after many edits.
