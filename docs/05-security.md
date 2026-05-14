# 5. Security & Sanitization

Penman treats every HTML round-trip — paste, `setContent`, source-view apply, plugin insertions — as untrusted. Three layers cooperate to block XSS:

```
        host page / user input
                │
                ▼
   ┌──────────────────────────┐
   │ 1. Sanitizer             │  allowlist of tags, attrs, styles, URLs
   │    src/sanitization/     │
   └──────────────────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │ 2. safeUrl()             │  scheme-level URL validator
   │    src/utils/html.js     │  used by LinkPlugin, SuggestedPosts, more
   └──────────────────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │ 3. stripUnsafeAttributes │  defense-in-depth strip of on* + bad URLs
   │    src/utils/html.js     │  called inside insertHTMLAtSelection
   └──────────────────────────┘
                │
                ▼
        editable area DOM
```

## 5.1. The Sanitizer

`src/sanitization/Sanitizer.js` is a schema-driven allowlist.

### What's allowed

Defined in `Sanitizer.js`:

- `allowedTags` — explicit whitelist (`p`, `h1-h6`, `strong`, `em`, `a`, `img`, `figure`, `figcaption`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `ul`, `ol`, `li`, `blockquote`, `pre`, `code`, `iframe`, `video`, `audio`, etc.).
- `allowedAttrs` — per-tag attribute allowlist (e.g. `a` allows `href`, `target`, `rel`; `img` allows `src`, `alt`, `title`, `width`, `height`, `loading`).
- `nativeStylesByTag` — which inline styles survive per tag (e.g. `td` accepts `border`, `padding`, `background`; `p` accepts very little).
- `allowedURLSchemes` — `http:`, `https:`, `mailto:`, `tel:`, fragments, relative URLs.
- `allowedClasses` — Penman's own `penman-*` classes plus the `blockTypes.class` values declared at init time.

### What's stripped

- Tags outside `allowedTags` — unwrapped (children kept) or removed entirely for known-dangerous tags (`script`, `style`, `meta`, `link`, `object`, `embed` unless explicitly in the embed plugin's path).
- Attributes outside the per-tag list — removed silently.
- `href` / `src` with schemes outside the allowlist — removed. `javascript:` is rejected even with whitespace, control characters, or mixed case obfuscation.
- `iframe` `src` is further constrained to `http:`/`https:` only.
- Inline styles whose properties aren't in `nativeStylesByTag` for the host tag.
- Non-`penman-*` classes that aren't in `blockTypes.class`.

### When it runs

| Boundary | Trigger |
|---|---|
| Paste | `Editor._handlePaste` runs sanitization before insertion. |
| `setContent(html)` | Sanitization runs before writing to the editable area. |
| Source-view apply | `SourceCodePlugin` runs sanitization on the user-edited HTML before replacing `innerHTML`. |
| Plugin `insertContent` | `editor.insertContent` routes through `insertHTMLAtSelection`, which uses the sanitizer's URL allowlist via `safeUrl()`. |

`getContent()` does NOT re-sanitize — it returns the editor's current internal HTML cleaned of editor-only attributes (selection markers, cell ids, transaction descriptors). The host application's persistence layer should still re-sanitize server-side as defense in depth.

### Protected scope

Internal editor widgets carry `data-penman-core="true"` so their attributes survive the sanitizer even if they wouldn't normally be allowed. This trust marker is ONLY honoured for elements already in the DOM; pasted content claiming `data-penman-core="true"` does not get a free pass — the sanitizer strips that attribute from incoming content before the normalization phase that reads it.

### Adding to the allowlist

Two paths:

1. Per-init: pass `blockTypes` with custom `class` values — those classes are auto-added to the allowlist for the lifetime of that editor instance.
2. Globally: edit `src/sanitization/Sanitizer.js`. The schema is plain JavaScript objects at the top of the class, easy to fork.

## 5.2. URL validation (`safeUrl`)

`src/utils/html.js` exports `safeUrl(url)`. Rules:

| Input | Output |
|---|---|
| `https://example.com` | `'https://example.com'` |
| `http://example.com` | accepted |
| `mailto:a@b.com`, `tel:+1...`, `sms:+1...`, `ftp://...` | accepted |
| `/relative/path`, `./rel`, `../up`, `#anchor` | accepted |
| `data:image/png;base64,...` | accepted (image only) |
| `data:text/html,<script>` | **null** (rejected) |
| `javascript:alert(1)` | **null** (rejected, case + whitespace tolerant) |
| `vbscript:`, `file:`, `about:` | **null** (rejected) |
| Unknown scheme | **null** (conservative default) |

Returned `null` means callers should ignore the URL silently. Currently used by:
- `LinkPlugin` — modal's "Insert" silently noops on null.
- `SuggestedPostsPlugin` — shows the existing "invalid URL" error.
- `stripUnsafeAttributes` (below) — removes the offending attribute from the element.

## 5.3. `stripUnsafeAttributes`

Used inside `insertHTMLAtSelection` (in `src/utils/domCommands.js`) after parsing the fragment but before insertion:

- Walks every descendant element.
- Removes any attribute matching `/^on/i` (covers `onclick`, `onerror`, `onmouseover`, `onfocus`, `onpointerdown`, etc.).
- For URL-bearing attributes (`href`, `src`, `action`, `formaction`, `xlink:href`) — replaces the value with `safeUrl(value)`, or removes the attribute if `safeUrl` returns null.

This runs in addition to the sanitizer, not instead of. Even if a plugin builds HTML via template strings (e.g. `editor.insertContent('<a href="' + input + '">x</a>')`) and forgot to call `safeUrl`, the insertion path catches the bad attribute before it lands in the DOM.

## 5.4. Where insertion paths converge

Anything that ends up in the editable area goes through one of these three points — auditable, easy to extend:

| Path | What it runs |
|---|---|
| `editor.setContent(html)` | Sanitizer → write to `innerHTML`. |
| `editor._handlePaste(event)` | Sanitizer → smart-paste merge → `insertHTMLAtSelection`. |
| `editor.insertContent(html)` | `insertHTMLAtSelection` (which does the `on*` + URL strip). For pre-sanitized HTML, you can call `_handlePaste`-style direct insertion via `editor.editableArea.appendChild` — but only inside plugin code that knows the content is trusted (e.g. a freshly constructed widget). |

## 5.5. Threat model

In scope:
- **Stored XSS** via clipboard content from another website.
- **Reflected XSS** via host-application-provided initial content.
- **URL-scheme injection** in user-typed link fields.
- **Inline event handlers** smuggled through HTML pasted from rich-text sources.

Out of scope (not the editor's job):
- **DOM Clobbering** on the host page — that's the host's CSP responsibility.
- **Server-side trust of `getContent()`** — re-sanitize on your backend. The browser-side sanitizer is the *first* line, not the only one.
- **CSP violations from inline `<style>`** — the editor injects a `<style>` tag (CSS auto-injection in the CDN build). If your CSP forbids inline styles, load `dist/penman.css` explicitly instead and use the ES build with `cssInjection: false` (forking `vite.config.js` accordingly).

## 5.6. Reporting a security issue

Open a GitHub issue tagged `security`. Please include a minimal reproduction (HTML to paste, what got past the sanitizer). The repo maintainer will respond and patch in a future point release; the CHANGELOG will note the fix without disclosing the unsafe payload.
