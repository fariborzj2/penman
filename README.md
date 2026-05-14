<p align="center">
  <img src="public/penman-logo.svg" alt="Penman" width="360" />
</p>

# Penman Editor

A framework-agnostic, modular vanilla-JavaScript rich text editor (WYSIWYG) with first-class RTL/Persian support, dark mode, and a sanitizer-first content pipeline.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/penman-editor.svg)](https://www.npmjs.com/package/penman-editor)

## Highlights

- **Zero framework lock-in** — works with React, Vue, Svelte, Angular, or no framework at all.
- **Modular plugins** — each plugin is a self-contained folder. Delete the folder, delete the plugin (strings, icons, toolbar entries all go with it).
- **Strict allowlist sanitizer** — every paste / `setContent` / source-view round-trip is filtered against a schema. `javascript:` / `vbscript:` / `data:text/*` URLs are stripped even with whitespace or case obfuscation.
- **Dark mode** — `data-theme="dark"` attribute, system-preference fallback, and live theme switching (CodeMirror syntax tokens re-theme on the fly).
- **RTL/Persian** — direction detection, ZWNJ-aware normalization, RTL-flipped icons, and Persian translations shipped with every plugin.
- **21 built-in plugins** — bold/italic/underline/strikethrough, headings, block types, font size, lists, tables, images & gallery, embeds, media (video/audio), code blocks (CodeMirror + highlight.js), find/replace, markdown shortcuts, drafts (auto-save to IndexedDB/localStorage), source view, color picker, content audit, suggested posts, help dialog, and more.
- **Themed UI primitives** — `FormModal` (declarative form schema), `DropdownMenu` (items + search), `Tooltip` (shared service for all toolbar buttons), `ColorPicker`, `FloatingUI`.
- **Selection / history managers** with snapshot transactions for atomic edits.
- **Optional Node server** with safe upload handling (MIME allowlist, size cap, CORS allowlist).

## Installation

### Option A — CDN (no build step)

The fastest way to try Penman. CSS is bundled into the JS, so a single
`<script>` tag is enough.

```html
<textarea id="my-editor"></textarea>

<!-- jsDelivr (auto-mirrors npm) -->
<script src="https://cdn.jsdelivr.net/npm/penman-editor@0.1.0/dist/penman.umd.js"></script>

<!-- or unpkg -->
<!-- <script src="https://unpkg.com/penman-editor@0.1.0/dist/penman.umd.js"></script> -->

<script>
  const editor = penman.init({
    selector: '#my-editor',
    lang:    'en',
    theme:   'auto',
    plugins: ['format', 'list', 'blocktype', 'link', 'image', 'table', 'sourcecode', 'help'],
    toolbar: 'bold italic underline | blocktype | bullist numlist | link image table | sourcecode help'
  });
</script>
```

> **Pin your version in production.** `@latest` makes it easy to break by
> publishing — use a specific tag like `@0.1.0`.

A complete copy-paste example lives at
[`docs/cdn-example.html`](docs/cdn-example.html).

### Option B — npm

```bash
npm install penman-editor
```

```js
import penman from 'penman-editor';     // CSS auto-injects on first load
// or, if you prefer manual stylesheet handling:
// import 'penman-editor/dist/penman.css';

const editor = penman.init({
  selector: '#my-editor',
  lang: 'en',
  theme: 'auto',
  plugins: [
    'format', 'list', 'blocktype', 'fontsize', 'link', 'image',
    'media', 'embed', 'table', 'codeblock', 'sourcecode',
    'markdown', 'findreplace', 'color', 'direction', 'help'
  ],
  toolbar: {
    rows: [
      ['undo', 'redo', 'blocktype', 'fontsize', 'image', 'media', 'table', 'sourcecode', 'help'],
      ['bold', 'italic', 'underline', 'strikethrough', 'link', 'unlink',
       'justifyleft', 'justifycenter', 'justifyright', 'bullist', 'numlist', 'textcolor']
    ]
  }
});

editor.setContent('<p>Hello, world.</p>');
const html = editor.getContent();

editor.setTheme('dark');
```

## Public API

| Method | Description |
| --- | --- |
| `penman.init(options)` | Initialise one or more editors. Returns the instance (single match) or an array. |
| `penman.get(selector)` | Retrieve an instance by selector or id. |
| `penman.getByElement(el)` | Retrieve an instance by its underlying `<textarea>` element. |
| `penman.getByName(name)` | Retrieve an instance by its textarea `name` attribute. |
| `penman.getAll()` | Return every initialized editor. |
| `penman.remove(target)` | Remove an instance from the registry. |
| `editor.getContent()` | Return sanitized HTML stripped of internal editor attributes. |
| `editor.setContent(html)` | Replace content. Input is sanitized before insertion. |
| `editor.insertContent(html)` | Insert HTML at the current selection. |
| `editor.focus()` | Move focus to the editable area. |
| `editor.setTheme(value)` | `'dark' \| 'light' \| 'auto'` — controls `data-theme` on the wrapper. |
| `editor.getTheme()` | Returns the current theme setting. |
| `editor.execCommand(name, ...args)` | Run any registered command. |
| `editor.on(event, fn)` / `editor.off(event, fn)` / `editor.once(event, fn)` | Event subscription. |
| `editor.destroy()` | Fully tear down the instance, removing all listeners and references. |

### Events

- `init` — fired after `_createUI` and plugins finish initializing.
- `change` — content changed (debounced via history snapshots).
- `selectionChange` — selection moved.
- `themeChange` — `setTheme()` was called.
- `nodeSelected` — a widget (image, embed, table) was selected.
- `destroy` — instance is being torn down.

### Configuration options

```js
penman.init({
  selector: '#my-editor',         // required (or per-element via resolveConfig)
  lang: 'en',                     // 'en' | 'fa' (or any language registered by a plugin)
  theme: 'auto',                  // 'dark' | 'light' | 'auto' (default)
  direction: 'auto',              // 'rtl' | 'ltr' | 'auto'
  height: 300,                    // editable area height in px
  toolbar: { rows: [[...], ...] },// multi-row toolbar
  plugins: [/* names or factories */],
  blockTypes: [/* override defaults */],
  imageUploadFn: (file, onProgress) => Promise<{ url, alt }>,
  auditIgnoreH1: false,
  resolveConfig(el, defaultConfig) {
    return { ...defaultConfig, toolbar: el.dataset.toolbar };
  }
});
```

## Dark mode

Penman ships a complete dark theme. Activation matrix:

| Attribute on `<html>` or `.penman-wrapper` | Result |
| --- | --- |
| `data-theme="dark"` | Force dark (overrides system) |
| `data-theme="light"` | Force light (overrides system) |
| `data-theme="auto"` or not set | Follow `prefers-color-scheme` |

The runtime API:

```js
editor.setTheme('dark');
editor.setTheme('light');
editor.setTheme('auto');
editor.on('themeChange', t => console.log('Theme is now', t));
```

CSS variables (`--pm-*` for chrome, `--pmc-*` for content) cascade through the entire UI so even third-party plugins inherit the theme by default.

## Sanitization model

Every HTML round-trip — paste, `setContent`, source view — passes through `Sanitizer`:

- Tags not in `allowedTags` are unwrapped (or stripped for `<script>`/`<style>`).
- Attributes not configured for a tag are removed.
- `href` accepts `http:` / `https:` / `mailto:` / `tel:` / fragments / relative URLs; everything else is stripped, including obfuscated forms.
- `iframe` `src` is restricted to `http:` / `https:`.
- Inline styles are tag-aware: only properties listed in `nativeStylesByTag` (and configured `blockTypes`) survive.
- A protected scope (`data-penman-core="true"`) preserves attributes for internal widgets only; it's never honoured for content arriving from outside before sanitization has run.

Additionally, `insertHTMLAtSelection` (used by paste, markdown auto-conversion, etc.) strips `on*` event-handler attributes and validates URL-bearing attributes via `safeUrl()` as a defense-in-depth layer.

## Documentation

Architecture, security model, public API, and per-plugin guides live in [`docs/`](docs/). Highlights:

- [`docs/01-overview.md`](docs/01-overview.md) — product goals, what's bundled, what's out of scope.
- [`docs/02-architecture.md`](docs/02-architecture.md) — layers, init sequence, command flow.
- [`docs/04-plugin-system.md`](docs/04-plugin-system.md) — authoring contract, registration, testing.
- [`docs/05-security.md`](docs/05-security.md) — sanitizer, URL validation, threat model.
- [`docs/07-public-api.md`](docs/07-public-api.md) — complete `penman.*` and `editor.*` surface.
- [`docs/README.md`](docs/README.md) — index with one-liners + links to every plugin's README.

## Server (optional)

`server/server.js` ships a minimal Express server for image uploads with a MIME allowlist, configurable size cap, CORS allowlist, and environment-variable URL base.

```bash
PORT=3000 \
BASE_URL=https://cdn.example.com \
ALLOWED_ORIGIN=https://app.example.com \
MAX_FILE_SIZE_MB=10 \
npm run server
```

## Development

```bash
git clone https://github.com/fariborzj2/penman.git
cd penman
npm install
npm run dev            # vite dev server
npm test               # unit tests (vitest)
npm run test:coverage  # unit tests with coverage report
npm run build          # produces dist/penman.{es,umd}.js with sourcemaps
```

## Browser support

Modern evergreen browsers (Chrome / Edge / Firefox / Safari ≥ 2 versions). Uses `Selection`, `Range`, ES2020, custom properties, `:focus-visible`. Node 16+ for the build step.

## Contributing

Issues and pull requests are welcome at <https://github.com/fariborzj2/penman/issues>. Please read [`docs/04-plugin-system.md`](docs/04-plugin-system.md) before submitting plugin contributions — the author contract is non-negotiable for shipped plugins.

## License

MIT — see [LICENSE](LICENSE).
