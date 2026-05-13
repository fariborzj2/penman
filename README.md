<p align="center">
  <img src="public/penman-logo.svg" alt="Penman" width="360" />
</p>

# Penman Editor

A framework-agnostic, dependency-light Vanilla JavaScript rich text editor (WYSIWYG) with strong sanitization, first-class RTL/Persian support, and a plugin-based architecture.

## Features

- Zero framework lock-in — works with any (or no) framework
- Strict HTML sanitizer with a schema-driven allowlist of tags, attributes, classes, and inline styles
- Pluggable: bold/italic/underline, headings, block types, lists, tables, images & gallery, embeds, code blocks (CodeMirror + highlight.js), find/replace, markdown shortcuts, drafts, source view, suggested posts
- Built-in RTL/LTR direction handling and ZWNJ-aware Persian text normalization
- Modal, floating toolbar, and color-picker primitives ready for plugin use
- Selection/history managers with snapshot transactions for atomic edits
- Optional Node server with safe upload handling (MIME allowlist + size limits + CORS allowlist)

## Installation

```bash
npm install penman-editor
```

## Quick start

```html
<textarea id="my-editor"></textarea>
<script type="module">
  import penman from 'penman-editor';

  const editor = penman.init({
    selector: '#my-editor',
    toolbar: 'bold italic underline | h1 h2 | ul ol | link image table | sourcecode',
    plugins: [
      // optional plugin instances or factories
    ],
  });

  // Read / write content
  const html = editor.getContent();
  editor.setContent('<p>Hello, world.</p>');
</script>
```

If you load the UMD build directly in the browser, expose it as a global:

```html
<script src="penman.umd.js"></script>
<script>
  const editor = penman.init({ selector: '#my-editor' });
</script>
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
| `editor.destroy()` | Fully tear down the instance, removing all listeners and references. |

### Configuration options

```js
penman.init({
  selector: '#my-editor',          // required
  toolbar: 'bold italic | h1 h2',  // space/pipe-separated button names
  plugins: [/* ... */],            // additional plugins
  blockTypes: [/* ... */],         // optional override of default block types
  resolveConfig(el, defaultConfig) {
    // optional per-element configuration callback
    return { ...defaultConfig, toolbar: el.dataset.toolbar };
  },
});
```

## Sanitization model

Every HTML round-trip — paste, `setContent`, source view — passes through `Sanitizer`. The sanitizer is allowlist-driven:

- Tags not present in `allowedTags` are unwrapped.
- Attributes not configured for a tag are stripped.
- `href` is restricted to `http:`, `https:`, `mailto:`, `tel:`, fragment identifiers, and relative URLs. All other schemes (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`) are stripped — including obfuscation via whitespace, control characters, or case.
- `iframe` `src` is restricted to `http:` / `https:` only.
- Inline styles are tag-aware: only the properties listed in `nativeStylesByTag` (and configured `blockTypes`) survive.
- A protected scope (`data-penman-core="true"`) preserves attributes for internal widgets only; it is never honoured for content arriving from outside before normal sanitization has run.

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
npm install
npm run dev            # vite dev server
npm test               # unit tests (vitest)
npm run test:coverage  # unit tests with coverage report
npm run build          # produces dist/penman.{es,umd}.js with sourcemaps
```

## License

MIT
