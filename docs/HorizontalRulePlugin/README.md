# HorizontalRulePlugin

Inserts a selectable, deletable `<hr>` widget. Rendered as a block with a generous click target so the user can select and remove it with one click rather than the awkward native `<hr>` behavior.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['hr'],
  toolbar: 'hr'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `INSERT_HORIZONTAL_RULE` | Inserts `<hr>` at the caret. |
| Button | `hr` | Toolbar icon. |
| i18n namespace | `plugins.hr` | |
| Icons | `hr` | |

## Markdown shortcut

Typing `---` on its own line at the start of a paragraph auto-converts to an `<hr>` (handled by `MarkdownPlugin`).

## Behaviour

`penman-content.css` renders `<hr>` as a 28-pixel-tall block with a centered 1px divider. The widget has `cursor: pointer` so clicking it selects the whole HR — Backspace then removes it. Selection highlight outlines the entire widget (not just the line).
