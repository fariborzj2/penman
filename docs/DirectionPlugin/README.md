# DirectionPlugin

Manages text direction (RTL / LTR / Auto) on a per-block basis. Adds three toolbar buttons and three commands. Smart — only changes blocks whose direction was previously unset, leaving explicitly-locked blocks alone.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['direction'],
  toolbar: 'dirrtl dirltr dirreset',
  directionOptions: { default: 'rtl', toolbar: true }
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `SET_DIR_RTL` | Forces RTL on the current block(s), locks the block as "manual". |
| Command | `SET_DIR_LTR` | Forces LTR on the current block(s), locks. |
| Command | `RESET_DIR` | Removes manual lock and inline `dir`; auto-detection takes over. |
| Buttons | `dirrtl`, `dirltr`, `dirreset` | Toolbar icons. |
| i18n namespace | `plugins.direction` | |
| Icons | `dirrtl`, `dirltr`, `dirreset` | |

## How auto-detection works

`directionDetector.js` runs on input. It does a **first-strong** scan: looks at the first character with strong directionality (RTL letters for Hebrew/Arabic/Persian or LTR for Latin/Cyrillic) and applies the matching direction to the block. Falls back to a **character-ratio** heuristic when first-strong is ambiguous (e.g. starts with a number).

`lockManager.js` records which blocks the user manually set. Locked blocks are skipped by the detector so the user's explicit choice survives editing.

`directionApplier.js` writes `dir="rtl|ltr"` to the block element and applies the corresponding `text-align`. Supported block tags are listed in `SUPPORTED_BLOCK_TAGS` (p, h1-h6, blockquote, li, td, th, etc.).

## Boundaries

- Only operates on block-level elements. Inline runs cannot have their own direction (use Unicode RLO/PDF instead if needed).
- Does NOT change the editor's overall `dir` attribute (that's set by `editor.init({ direction })`).
- Does NOT strip incoming `dir` attributes during paste — they survive sanitization. Use `stripIncomingDirection` from the plugin's exports if you need that.
