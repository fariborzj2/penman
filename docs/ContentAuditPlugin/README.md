# ContentAuditPlugin

Real-time content quality audit. Opens a side panel that scores the document on SEO, accessibility, readability, structure, media, links, performance, HTML quality, and security — with one-click jump-to-issue and Auto-fix for some rule classes.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['audit'],
  toolbar: 'audit',
  auditIgnoreH1: false  // optional: skip "page must have H1" rule
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `CONTENT_AUDIT` | Opens the audit modal. |
| Button | `audit` | Toolbar icon (book with checklist). |
| i18n namespace | `plugins.audit` | 100+ keys: rule titles, fix hints, stats labels. |

## Rule categories (40+ rules)

- **SEO** — H1 presence, H1 length, multiple H1s, thin content, lorem-ipsum detection.
- **Accessibility** — image alt, iframe title, empty link / button, missing input label.
- **Readability** — long paragraph, long sentence, no headings, no lists, repeated word, keyword density.
- **Structure** — heading-level skips, empty headings, duplicate heading text.
- **Media** — missing width/height, missing `loading="lazy"`, duplicate alt text.
- **Links** — broken / malformed URLs, empty href, insecure http, weak anchor text, duplicate links, missing `rel="noopener"`. Async HEAD-checks for broken/timeout/network status.
- **Performance** — many large images, low text-to-HTML ratio.
- **HTML quality** — empty inline elements, excessive inline styles, nested same tags.
- **Security** — inline event handlers, `javascript:` URLs, non-https iframe.

## Live behaviour

Recomputes on `change` (debounced). Severity bands (Critical / Warning / Suggestion / Passed) drive color. Score is `100 - weighted issue count`. The "Auto-fix" button on supported rules applies a safe transform (e.g. add `loading="lazy"`, wrap empty image with alt). Async link checks queue and update results when the network responds.

## Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `auditIgnoreH1` | `boolean` | `false` | Skip the "page must have H1" rule (useful when the page title lives outside the editor). |
