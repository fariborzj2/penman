# ListPlugin

Bulleted, numbered, indent, and outdent list operations. Uses native `execCommand('insertUnorderedList' / 'insertOrderedList' / 'indent' / 'outdent')` with selection-preserving wrappers.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['list'],
  toolbar: 'bullist numlist indentlist outdentlist'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Buttons | `bullist`, `numlist`, `indentlist`, `outdentlist` | Each maps to a native execCommand under the hood. |
| i18n namespace | `plugins.list` | |
| Icons | `bullist`, `numlist`, `indentlist`, `outdentlist` | |
| Keyboard | `Tab` / `Shift+Tab` | Inside a list, Tab indents the current item; Shift+Tab outdents. |

## Markdown shortcuts

(Handled by `MarkdownPlugin` — listed here for awareness.)

- `- ` or `* ` at the start of a paragraph → bullet list.
- `1. ` at the start of a paragraph → numbered list.

## Behaviour

`Tab`/`Shift+Tab` only intercept when the caret is inside an `<li>`. Outside lists, Tab keeps its normal browser behavior (focuses next form element). Nested lists work via repeated Tab.
