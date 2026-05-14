# FindReplacePlugin

Find-and-replace with diacritic-insensitive RTL matching. Opens a modal with Find / Replace / Match-case / Ignore-diacritics / All-words options and Next / Prev / Replace / Replace All buttons.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['findreplace'],
  toolbar: 'findreplace'
});
```

Also opens with `Ctrl/⌘+F` while the editor is focused.

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Button | `findreplace` | Toolbar icon. |
| i18n namespace | `plugins.findReplace` | |
| Icons | `findreplace` | |

## Search engine

- Diacritic normalization: when "Ignore Diacritics (RTL)" is on, the search runs on a NFD-stripped form of the content so هاء/کاف variants and Arabic kashida marks all match the corresponding Persian letters.
- `TextMapper` maintains a bidirectional offset map between the normalized search text and the live DOM, so highlighting and replacement land on the correct ranges even with mixed normalization.
- "All words" matches each word in the find input separately (OR-style multi-token search).

## Behaviour

- Each found match is highlighted in turn (the active match wraps with a `<mark>`-like span).
- Replace runs on the active match; Replace All iterates in reverse so earlier offsets stay valid.
- A snapshot is pushed to history before Replace All so undo restores the entire bulk operation.
