# Penman Documentation

This folder is the canonical reference for the editor — architecture, public API, security model, and every plugin. Two doc sets:

1. **Architecture & general** (8 docs) — how the editor is built and how to use / extend it.
2. **Per-plugin** (21 docs) — one README per shipped plugin, accurate to the current code.

If you only need three docs to get started, read these in order:

1. [`07-public-api.md`](07-public-api.md) — methods, events, options.
2. [`02-architecture.md`](02-architecture.md) — how core, commands, plugins fit together.
3. The plugin you'll use — pick from the table further down.

---

## Architecture & general docs

| # | Doc | Scope |
|---|---|---|
| 1 | [Overview](01-overview.md) | Product positioning, design goals, what's bundled, what's out of scope. |
| 2 | [Architecture](02-architecture.md) | Layers, folder layout, init sequence, command flow, plugin registration flow. |
| 3 | [Core Engine](03-core-engine.md) | Editor class, Selection, Commands, History, smart paste, block breakout, textarea sync. |
| 4 | [Plugin System](04-plugin-system.md) | Plugin folder shape, registration contract, i18n/icon conventions, author rules, testing. |
| 5 | [Security & Sanitization](05-security.md) | Sanitizer allowlist, `safeUrl()`, `stripUnsafeAttributes`, threat model, reporting issues. |
| 6 | [UI System](06-ui-system.md) | Toolbar (responsive), Modal, FormModal, Dropdown, DropdownMenu, Tooltip, ColorPicker, FloatingUI, theming. |
| 7 | [Public API](07-public-api.md) | Complete `penman.*` and `editor.*` surface, events catalog, plugin sub-APIs, versioning. |
| 8 | [Roadmap & Limits](08-roadmap-and-limits.md) | What v0.1 ships, known limitations with concrete migration triggers, future ideas, stability commitments. |
| — | [`cdn-example.html`](cdn-example.html) | Copy-paste demo of CDN usage (one `<script>` tag, no build step). |

---

## Plugins

Every plugin is self-contained: dropping `plugins: ['X']` into `penman.init()` is enough. Each entry below links to the plugin's accurate, current `README.md`.

| Plugin | One-liner | i18n NS | Commands | Toolbar names |
|---|---|---|---|---|
| [BlockTypePlugin](BlockTypePlugin/README.md) | Convert current block (paragraph / heading / blockquote / callout) via searchable dropdown with live previews. | `plugins.blockType` | `SET_BLOCK_TYPE` | `blocktype` |
| [CodeBlockPlugin](CodeBlockPlugin/README.md) | Insert and render `<pre><code>` blocks with built-in regex tokenizer. | `plugins.codeBlock` | `INSERT_CODEBLOCK` | `codeblock` |
| [ColorPlugin](ColorPlugin/README.md) | Foreground + background color pickers (palette + hex + transparent). | `plugins.color` | `SET_TEXT_COLOR`, `SET_HIGHLIGHT_COLOR` | `textcolor`, `highlight` |
| [ContentAuditPlugin](ContentAuditPlugin/README.md) | 40+ rule audit (SEO, a11y, readability, structure, media, links, perf, HTML, security) with score + auto-fix. | `plugins.audit` | `CONTENT_AUDIT` | `audit` |
| [DirectionPlugin](DirectionPlugin/README.md) | Smart RTL / LTR / auto direction per block, with manual locks that survive auto-detection. | `plugins.direction` | `SET_DIR_RTL`, `SET_DIR_LTR`, `RESET_DIR` | `dirrtl`, `dirltr`, `dirreset` |
| [DraftPlugin](DraftPlugin/README.md) | Autosave to localStorage / IndexedDB + restore banner on next load. Silent UX, no toolbar button. | `plugins.draft` | — | — |
| [EmbedPlugin](EmbedPlugin/README.md) | Insert iframe / embed / blockquote widgets via a validated HTML textarea modal. | `plugins.embed` | — | `embed` |
| [FindReplacePlugin](FindReplacePlugin/README.md) | Find / replace with diacritic-insensitive RTL matching; opens with Ctrl/⌘+F. | `plugins.findReplace` | — | `findreplace` |
| [FontSizePlugin](FontSizePlugin/README.md) | Dropdown of font sizes; each option previews at its own size. | `plugins.fontSize` | `SET_FONT_SIZE` | `fontsize` |
| [FormatPlugin](FormatPlugin/README.md) | Bold / italic / underline / strikethrough / sup / sub with tag normalization. | — | `bold`, `italic`, `underline`, `strikethrough`, `superscript`, `subscript` | same names |
| [HelpPlugin](HelpPlugin/README.md) | Categorized help dialog (shortcuts, markdown, tips, about). Opens via toolbar or F1. | `plugins.help` | `OPEN_HELP` | `help` |
| [HorizontalRulePlugin](HorizontalRulePlugin/README.md) | Selectable `<hr>` widget with generous click target. | `plugins.hr` | `INSERT_HORIZONTAL_RULE` | `hr` |
| [ImagePlugin](ImagePlugin/README.md) | Insert by URL / upload / gallery. Floating toolbar with align + edit + delete. | `plugins.image` | — | `image` |
| [LinkPlugin](LinkPlugin/README.md) | Insert / edit / unlink with target + rel options. URL validated via `safeUrl()`. | `plugins.link` | `REMOVE_LINK` | `link`, `unlink` |
| [ListPlugin](ListPlugin/README.md) | Bullet / numbered / indent / outdent with Tab/Shift+Tab support. | `plugins.list` | — | `bullist`, `numlist`, `indentlist`, `outdentlist` |
| [MarkdownPlugin](MarkdownPlugin/README.md) | Inline markdown shortcuts on typing + paste-time markdown→HTML conversion. | — | — | — |
| [MediaPlugin](MediaPlugin/README.md) | Insert video/audio via direct URL or YouTube/Vimeo/Aparat providers with live preview. | `plugins.media` | — | `media` |
| [RemoveFormatPlugin](RemoveFormatPlugin/README.md) | Strip inline formatting (b/i/u/span/a/mark) from selection. | `plugins.removeFormat` | `CLEAR_FORMATTING` | `removeformat` |
| [SourceCodePlugin](SourceCodePlugin/README.md) | CodeMirror-powered HTML source view with search; dark syntax when editor is in dark mode. | `plugins.sourceCode` | — | `sourcecode` |
| [SuggestedPostsPlugin](SuggestedPostsPlugin/README.md) | Curated link-list widget with floating edit/delete toolbar. | `plugins.suggestedPosts` | — | `suggestedposts` |
| [TablePlugin](TablePlugin/README.md) | Full tables with hover-grid insert, cell selection, merge/split (rollback-safe), properties modal. | `plugins.table` | `INSERT_TABLE`, `SELECT_TABLE`, `OPEN_TABLE_PROPERTIES_MODAL`, `MERGE_CELLS`, `SPLIT_CELL`, `ADD_ROW`, `REMOVE_ROW`, `ADD_COLUMN`, `REMOVE_COLUMN`, `SET_TABLE_PROPERTIES`, `SET_CELL_PROPERTY` | `table` |

---

## Doc template (for new plugins)

Every plugin README follows the same layout so consumers can scan quickly:

1. **One-liner** — what it does (and what it doesn't).
2. **Activate** — minimal `penman.init(...)` snippet to turn it on.
3. **What it registers** — table of commands, buttons, dropdowns, i18n namespace, icons.
4. **Behaviour** — interesting runtime details (keyboard shortcuts, edge cases, security).
5. **Options** — config table when the plugin reads from `editor.options`.
6. **Boundaries** — explicit list of what's intentionally out of scope.

If you're authoring a new plugin, copy the layout of any existing plugin README. The full author contract is in [`04-plugin-system.md`](04-plugin-system.md).
