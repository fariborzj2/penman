# FontSizePlugin

Single dropdown that sets the font-size on the current selection by wrapping it in `<span style="font-size: …">`. Each dropdown option renders at its own size so users see the result before clicking.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['fontsize'],
  toolbar: 'fontsize',
  fontSizes: ['12px', '14px', '16px', '18px', '24px', '32px']  // default
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `SET_FONT_SIZE` | Receives the size string; wraps current selection. |
| Dropdown | `fontsize` | Shows each size rendered at its own size (visual preview). |
| i18n namespace | `plugins.fontSize` | |

## Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `fontSizes` | `string[]` | `['12px','14px','16px','18px','24px','32px']` | Sizes shown in the dropdown. Any valid CSS length string is accepted. |

## Behaviour

The dropdown's trigger label shows the active size; it updates on `selectionChange` by reading `computedStyle.fontSize` of the caret's parent. The active size is preserved across selection moves.
