# SuggestedPostsPlugin

Insert a curated "suggested posts" widget: a titled box with a vertical list of internal/external links. Useful for editorial workflows where related content blocks should be hand-picked rather than algorithmic.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['suggestedposts'],
  toolbar: 'suggestedposts'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Button | `suggestedposts` | Toolbar icon. |
| i18n namespace | `plugins.suggestedPosts` | |
| Icons | `suggestedposts` | |

## Modal flow

A `FormModal` with two inputs (title + URL) plus an "Add link" button. Each added item appears in a list above with Edit / Delete affordances. Submit inserts a single widget:

```html
<div class="penman-suggested-posts-wrapper" contenteditable="false">
  <div class="penman-suggested-posts-wrapper-title">Suggested posts</div>
  <ul class="penman-suggested-posts-wrapper-list">
    <li><a href="..." target="_blank" rel="noopener noreferrer">Post title</a></li>
    ...
  </ul>
</div>
```

The wrapper is `contenteditable="false"` so the user can't accidentally type inside it. A floating toolbar appears on click with Edit and Delete buttons.

## URL safety

Every URL is double-validated:
1. `new URL(rawUrl)` ensures syntactic correctness.
2. `safeUrl()` from `utils/html.js` rejects `javascript:`/`vbscript:`/`data:text/*`/etc.

## Boundaries

- Does NOT fetch link previews / OG cards. Title is user-typed.
- Edit only modifies links via the modal — the rendered HTML is intentionally read-only in-place.
