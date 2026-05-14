# LinkPlugin

Insert and edit hyperlinks via a modal (URL / display text / target / rel). Smart enough to detect whether the caret is inside an existing link and pre-fill the modal, OR to wrap a selected widget (image, embed) in an anchor instead of plain text.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['link'],
  toolbar: 'link unlink'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `REMOVE_LINK` | Unwraps every `<a>` that intersects the current selection. |
| Buttons | `link`, `unlink` | Toolbar icons. |
| i18n namespace | `plugins.link` | |
| Icons | `link`, `unlink` | |

## Modal fields

| Field | Type | Notes |
|---|---|---|
| URL | url | Required. Validated via `safeUrl()` — `javascript:`/`vbscript:`/`data:text/*` are rejected. |
| Display text | text | Auto-filled with the current text selection. |
| Target | select | None / `_blank` / `_self` / `_parent` / `_top`. |
| Rel | text | Free-form. Default `noopener` when target is `_blank`. |

## Security

URL passes through `safeUrl()` from `utils/html.js`. If it returns null, the modal silently rejects the link rather than producing a `<a href="javascript:...">` XSS vector.

## Behaviour

- Caret inside existing `<a>` → modal opens in edit mode, prefilled.
- Pre-selected widget (image figure) → on submit, the figure is wrapped in `<a>` (the figure stays, the URL becomes the link target). Useful for "image links".
- Plain selection → inserts `<a href="...">selected text or URL</a>` at the saved selection point.
- Unlink unwraps `<a>` ancestors of the caret AND every `<a>` descendant whose range intersects the selection (handles partial selection cleanly).
