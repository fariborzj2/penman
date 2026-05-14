<p align="center">
  <!-- Replace with the project's hosted logo URL when publishing to npm so
       the image renders on npmjs.com (relative paths don't load there). -->
  <img src="https://raw.githubusercontent.com/fariborzj2/penman/main/public/penman-logo.png" alt="Penman" width="360" />
</p>

# Penman Editor

A modern, framework-agnostic rich text editor with a plugin architecture and zero external runtime dependencies.

<p align="center">
  <a href="https://www.npmjs.com/package/penman-editor"><img src="https://img.shields.io/npm/v/penman-editor.svg?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/penman-editor"><img src="https://img.shields.io/npm/dm/penman-editor.svg?style=flat-square" alt="npm downloads"></a>
  <a href="https://bundlephobia.com/package/penman-editor"><img src="https://img.shields.io/bundlephobia/minzip/penman-editor?style=flat-square" alt="bundle size"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/penman-editor.svg?style=flat-square" alt="license"></a>
</p>

<p align="center">
  <!-- Replace with real screenshots after the first release.
       Recommended: 1200×720 PNG, one light-mode and one dark-mode capture. -->
  <img src="https://raw.githubusercontent.com/fariborzj2/penman/main/public/screenshot-light.png" alt="Penman in light mode" width="48%">
  <img src="https://raw.githubusercontent.com/fariborzj2/penman/main/public/screenshot-dark.png"  alt="Penman in dark mode"  width="48%">
</p>

Penman is a WYSIWYG editor written in vanilla JavaScript. It drops in over a `<textarea>`, ships its own UI primitives, and exposes a small public API that's stable across releases. RTL/Persian, dark mode, and strict HTML sanitization are first-class — not afterthoughts.

- **Lightweight** — single UMD or ES module, no runtime peer dependencies
- **Modular** — twenty-one self-contained plugins; remove a folder, remove the feature
- **Themed** — built-in light / dark / auto mode via CSS variables
- **Bilingual** — Persian + English translations shipped for every plugin
- **Sanitized by default** — every paste, `setContent`, and source-view round-trip filtered against an allowlist
- **TypeScript ready** — type definitions ship with the package

---

## Features

- **Plugin architecture** — twenty-one shipped plugins; third-party plugins register at runtime with `penman.PluginManager.add(name, setupFn)`
- **RTL / LTR / Auto direction** — per-block detection with user-locked overrides; Persian (Vazirmatn font bundled), Arabic, Hebrew supported out of the box
- **Undo / redo** — snapshot-based history with `pushImmediate()` for atomic plugin operations and debounced commits during typing
- **Tables** — hover-grid insert, multi-cell rectangular selection, merge / split with rollback, properties modal
- **Image handling** — direct URL, drag-and-drop, paste, and registrable galleries; pluggable `imageUploadFn` for any backend
- **Markdown shortcuts** — type `# ` for H1, `- ` for bullets, `> ` for quote, `` `code` `` for inline code, and more
- **Source view** — CodeMirror-powered HTML editor with search and theme-aware syntax highlighting
- **Find & replace** — diacritic-insensitive RTL matching; opens with <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>F</kbd>
- **Content audit** — 40+ rules covering SEO, accessibility, readability, structure, media, links, performance, HTML quality, and security
- **Drafts** — autosave to IndexedDB / localStorage with restore-on-load banner
- **Strict sanitization** — allowlisted tags, attributes, classes, inline styles, and URL schemes; `javascript:`, `vbscript:`, and unsafe `data:` URIs blocked even with obfuscation
- **Zero external runtime dependencies** — only `codemirror/*` for the source-code plugin (already bundled)
- **TypeScript support** — `src/index.d.ts` ships with the package
- **Extensible toolbar** — single-row string config or two-row structured config with priority-based overflow
- **Internationalization** — `editor.i18n.register(namespace, { fa, en, ... })` for plugins; add a third language without touching core

---

## Installation

### npm

```bash
npm install penman-editor
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/penman-editor@0.1.0/dist/penman.umd.js"></script>
<!-- or -->
<script src="https://unpkg.com/penman-editor@0.1.0/dist/penman.umd.js"></script>
```

CSS is bundled into the JavaScript. No separate `<link>` is required.

> **Production tip:** Pin a specific version (`@0.1.0`) rather than `@latest` so a future publish can't break your page.

---

## Quick start

```html
<textarea id="editor"></textarea>
```

```js
import penman from 'penman-editor';

const editor = penman.init({
  selector: '#editor',
  lang: 'en',
  theme: 'auto',
  plugins: [
    'format', 'list', 'blocktype', 'fontsize', 'link', 'image',
    'table', 'sourcecode', 'findreplace', 'markdown', 'help'
  ],
  toolbar: {
    rows: [
      ['undo', 'redo', 'blocktype', 'fontsize', 'image', 'table', 'sourcecode', 'help'],
      ['bold', 'italic', 'underline', 'strikethrough', 'link', 'unlink',
       'bullist', 'numlist', 'findreplace']
    ]
  }
});

editor.setContent('<p>Welcome to Penman.</p>');
console.log(editor.getContent());
```

That's the entire integration. The hidden `<textarea>` is kept in sync with the editor on every change, so existing form submissions keep working without any extra code.

---

## Styling

CSS is auto-injected when the JavaScript loads. To preload styles before the bundle parses (preventing FOUC on slow connections), import the extracted stylesheet directly:

```js
import 'penman-editor/dist/penman.css';
```

The editor exposes two scopes of CSS variables so you can theme it from your host stylesheet:

| Scope | Used by | Example variables |
|---|---|---|
| `--pm-*` | Chrome (toolbar, modals, dropdowns, tooltips) | `--pm-bg`, `--pm-text`, `--pm-accent`, `--pm-radius-sm` |
| `--pmc-*` | Editable content area | `--pmc-text`, `--pmc-link`, `--pmc-bg-soft` |

```css
.penman-wrapper {
  --pm-accent: #ff6b35;
  --pm-radius-sm: 6px;
}
```

---

## TypeScript support

Type definitions are bundled. No `@types/` package needed.

```ts
import penman, { Editor, PenmanOptions } from 'penman-editor';

const options: PenmanOptions = {
  selector: '#editor',
  lang: 'fa',
  theme: 'dark',
  plugins: ['format', 'link']
};

const editor: Editor = penman.init(options);
```

---

## Plugins

A plugin is a function `setup(editor)` that runs once during initialization. Inside it the plugin registers commands, toolbar buttons, translations, and icons through the editor's public API. Plugins are fully isolated — they never reach into each other's state.

### Authoring a plugin

```js
import faStrings from './lang/fa.js';
import enStrings from './lang/en.js';
import icons from './icons/index.js';

export function setupHighlightPlugin(editor) {
  editor.i18n.register('plugins.highlight', { fa: faStrings, en: enStrings });
  editor.ui.iconProvider.register(icons);

  editor.commands.register('TOGGLE_HIGHLIGHT', {
    queryState: () => false,
    execute: (ed) => ed.insertContent('<mark>highlighted</mark>')
  });

  editor.ui.registry.addButton('highlight', {
    text: editor.i18n.t('plugins.highlight.label'),
    shortcut: 'Ctrl+Shift+H',
    onAction: () => editor.execCommand('TOGGLE_HIGHLIGHT')
  });
}
```

### Registering a third-party plugin

```js
import penman from 'penman-editor';
import { setupHighlightPlugin } from './my-highlight-plugin/index.js';

penman.PluginManager.add('highlight', setupHighlightPlugin);

penman.init({
  selector: '#editor',
  plugins: ['format', 'highlight'],
  toolbar: 'bold italic | highlight'
});
```

The full author contract — folder layout, i18n conventions, icon format, testing — is documented in [`docs/04-plugin-system.md`](docs/04-plugin-system.md).

---

## Configuration

```js
penman.init({
  selector: '#editor',              // required: CSS selector or HTMLTextAreaElement

  // Surface
  lang: 'en',                       // 'en' | 'fa' | any language a plugin registers
  direction: 'auto',                // 'rtl' | 'ltr' | 'auto'
  theme: 'auto',                    // 'dark' | 'light' | 'auto'
  height: 320,                      // pixels; the editable area is resizable

  // Content
  plugins: [                        // names from the registry
    'format', 'list', 'blocktype', 'link', 'image',
    'table', 'sourcecode', 'help'
  ],
  toolbar: 'bold italic | link image | sourcecode',

  // Optional placeholder rendered when the editor is empty
  placeholder: 'Start writing…',

  // Plugin-specific options
  imageUploadFn: async (file, onProgress) => {
    // POST `file` to your backend, optionally call onProgress(loaded, total).
    return { url: 'https://cdn.example.com/...', alt: file.name };
  },
  draftDocumentId: 'post-42',       // enables DraftPlugin autosave
  fontSizes: ['12px', '14px', '16px', '18px', '24px', '32px'],

  // Accessibility
  ariaLabel: 'Article body editor'
});
```

For per-element configuration when the selector matches multiple textareas, pass a `resolveConfig(element, defaultConfig)` callback.

---

## API

### `penman` (registry)

| Method | Description |
|---|---|
| `penman.init(options)` | Initialize one or more editors; returns the instance or an array. |
| `penman.get(selectorOrId)` | Look up an instance by CSS selector or textarea `id`. |
| `penman.getAll()` | All initialized editors on the page. |
| `penman.getByElement(textarea)` | Look up by the original `<textarea>` element. |
| `penman.getByName(name)` | Look up by the textarea's `name` attribute. |
| `penman.remove(target)` | Tear down and remove an instance. |
| `penman.PluginManager` | Plugin registry; call `.add(name, setupFn)` for third-party plugins. |

### Editor instance

#### Content

| Method | Returns | Description |
|---|---|---|
| `editor.getContent()` | `string` | Sanitized HTML stripped of editor-only attributes. Safe to persist. |
| `editor.setContent(html)` | `void` | Replace the content. Sanitized before insertion. |
| `editor.insertContent(html)` | `void` | Insert at the current selection. Unsafe attributes and URLs stripped. |
| `editor.focus()` | `void` | Move focus to the editable area. |
| `editor.destroy()` | `void` | Detach all listeners and restore the original `<textarea>`. |

#### Commands

| Method | Description |
|---|---|
| `editor.execCommand(name, value?)` | Run any registered command. |
| `editor.commands.register(name, { queryState, execute })` | Register a command. |
| `editor.commands.queryState(name)` | Active state for a command (used to highlight toolbar buttons). |

#### Theme

| Method | Description |
|---|---|
| `editor.setTheme('dark' \| 'light' \| 'auto')` | Set `data-theme` on the wrapper. Emits `themeChange`. |
| `editor.getTheme()` | Returns the current theme. |

#### Events

| Method | Description |
|---|---|
| `editor.on(event, fn)` | Subscribe. |
| `editor.once(event, fn)` | One-shot subscription. |
| `editor.off(event, fn)` | Unsubscribe (handles `once()` wrappers too). |
| `editor.emit(event, ...args)` | Emit manually. |

---

## Events

| Event | Payload | When |
|---|---|---|
| `init` | `editor` | Plugins finished setup; safe to call `setContent`. |
| `change` | `html: string` | Content changed after a history-snapshotted edit. |
| `selectionChange` | — | Caret or range moved. |
| `nodeSelected` | `node: HTMLElement \| null` | A widget (image, embed, table) was selected. |
| `themeChange` | `theme: string` | `setTheme()` was called. |
| `beforePaste` | `{ text, html, preventDefault() }` | Paste intercepted; plugins can preempt. |
| `destroy` | — | Editor torn down. |

```js
editor.on('change', (html) => {
  // Persist to backend, debounced by the host application
  localStorage.setItem('draft', html);
});

editor.on('themeChange', (theme) => {
  document.documentElement.dataset.theme = theme;
});
```

---

## Internationalization

The editor ships with **Persian** and **English** translations for every plugin. Add another language at runtime:

```js
editor.i18n.register('plugins.link', {
  fr: {
    insert: 'Insérer un lien',
    urlLabel: 'URL',
    urlPlaceholder: 'https://exemple.com'
  }
});

editor.i18n.setLanguage('fr');
```

### RTL support

Penman is RTL-first. Set `direction: 'rtl'` or let `'auto'` detect per block:

```js
penman.init({
  selector: '#editor',
  lang: 'fa',
  direction: 'auto',
  plugins: ['format', 'direction', 'list']
});
```

Per-block direction detection uses a first-strong heuristic with a character-ratio fallback. Manual overrides via the toolbar are locked so auto-detection never overrides the user's choice.

---

## Browser support

| Browser | Minimum version |
|---|---|
| Chrome / Edge | last 2 versions |
| Firefox | last 2 versions |
| Safari | last 2 versions |
| iOS Safari | 14+ |
| Chrome for Android | last 2 versions |

The editor uses `Selection`, `Range`, ES2020 syntax, custom properties, and `:focus-visible`. Internet Explorer is not supported.

---

## Accessibility

- Toolbar buttons expose `aria-label` and `aria-pressed` (for toggle commands).
- Dropdowns use `aria-haspopup="menu"` + `aria-expanded`; menu items use `role="menuitem"`.
- Modals are announced as `role="dialog"` + `aria-modal="true"` with focus trap and Escape-to-close.
- Image, embed, table, and floating toolbars all use the themed tooltip service instead of the native `title` attribute, so screen readers receive the same information as sighted users.
- Keyboard shortcuts:
  - <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>B</kbd>/<kbd>I</kbd>/<kbd>U</kbd> — bold / italic / underline
  - <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> — undo / redo
  - <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>F</kbd> — find & replace
  - <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> — toggle source view
  - <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> — exit current block (block breakout)
  - <kbd>F1</kbd> — open the help dialog (HelpPlugin)
  - <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> — indent / outdent list items

---

## Development

```bash
git clone https://github.com/fariborzj2/penman.git
cd penman
npm install
npm run dev            # Vite dev server with the demo page
npm test               # Vitest unit tests
npm run build          # Produces dist/penman.{es,umd}.js + dist/penman.css
```

---

## Roadmap

- Column / row resize handles for tables
- Inline alt-text editor on image figures
- Touch / long-press support in the tooltip service
- `editor.getJSON()` — read-only AST view of the current document
- Per-plugin opt-in slice loading via dynamic `import()`

The full list with measurable migration triggers is in [`docs/08-roadmap-and-limits.md`](docs/08-roadmap-and-limits.md).

---

## License

[MIT](LICENSE) © Fariborz J.
