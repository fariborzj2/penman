# EmbedPlugin

Insert arbitrary embeddable HTML (iframe, embed, blockquote widgets like Twitter / Instagram, etc.). A modal with a textarea where the user pastes raw HTML; the plugin validates the snippet contains an embeddable tag and inserts it as a figure.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['embed'],
  toolbar: 'embed'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Button | `embed` | Toolbar icon. |
| i18n namespace | `plugins.embed` | |
| Icons | `embed` | |

## Modal

Built on `FormModal` with a single textarea field validated by:

```js
/<(iframe|embed|script|blockquote|video|audio)/i
```

The submitted snippet goes through the editor's sanitizer before reaching the DOM, so `<script>` is rejected and `iframe[src]` is restricted to `http:`/`https:`.

## Boundaries

- Does NOT scrape oEmbed metadata — user must paste the embed HTML themselves.
- Does NOT support custom embed providers beyond what the sanitizer allows (see `MediaPlugin` for typed providers like YouTube / Vimeo).
