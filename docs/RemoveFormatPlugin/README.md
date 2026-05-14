# RemoveFormatPlugin

Single toolbar button that strips inline formatting (bold/italic/underline/spans/links/marks) from the selection while preserving the text.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['removeformat'],
  toolbar: 'removeformat'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `CLEAR_FORMATTING` | Unwraps inline tags inside the selection. |
| Button | `removeformat` | Toolbar icon. |
| i18n namespace | `plugins.removeFormat` | |
| Icons | `removeformat` | |

## Behaviour

Walks every node inside the selection range and unwraps these inline tags: `strong`, `em`, `b`, `i`, `u`, `span`, `a`, `mark`, `s`, `strike`. Block tags (`p`, `h1-h6`, `blockquote`) are preserved — only inline wrappers are removed.

The selection is preserved after the operation so the user can repeat or undo cleanly.

## Boundaries

- Does NOT change block tags (use `BlockTypePlugin` to convert to plain `<p>`).
- Does NOT remove `<sub>`/`<sup>` (treat those as semantic, not formatting).
