# Penman Documentation

This folder is the canonical reference for every part of the editor — architecture, public API, security model, plugins, and the legacy spec history that informed the current design.

If you only need three docs to get started, read these in order:

1. **[Public API](20-public-api.md)** — methods, events, options.
2. **[Architecture](02-architecture.md)** — how core / commands / plugins fit together.
3. **The plugin you'll use** — pick from the table below.

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

## Architecture & general docs

These are conceptual / historical references. The plugin READMEs above are the up-to-date source of truth for runtime behaviour.

| Doc | Scope |
|---|---|
| [00-overview.md](00-overview.md) | High-level pitch and feature matrix. |
| [01-product-brief.md](01-product-brief.md) | Product goals: who is this editor for, what's in vs. out of scope. |
| [02-architecture.md](02-architecture.md) | Folder layout, runtime layers, plugin lifecycle. |
| [03-core-engine.md](03-core-engine.md) | `Editor` class internals, initialization phases. |
| [04-selection-system.md](04-selection-system.md) | `SelectionManager` — save / restore / select node / cell-selection coordination. |
| [05-command-system.md](05-command-system.md) | `CommandManager` — register / queryState / execute, fallback whitelist. |
| [06-plugin-system.md](06-plugin-system.md) | How plugins register strings, icons, commands, toolbar items. |
| [07-history-undo-redo.md](07-history-undo-redo.md) | Snapshot transactions, `pushImmediate`, debounced commits. |
| [08-security-sanitization.md](08-security-sanitization.md) | The sanitizer allowlist, URL validation, defense-in-depth. |
| [09-toolbar-ui.md](09-toolbar-ui.md) | Toolbar layout / overflow / multi-row rendering. |
| [10-roadmap.md](10-roadmap.md) | What's shipped vs. planned. |
| [11-developer-rules.md](11-developer-rules.md) | Code style, plugin authoring conventions. |
| [12-implementation-plan.md](12-implementation-plan.md) | Original phased build plan (historical). |
| [13-minimal-ir-architecture.md](13-minimal-ir-architecture.md) | The "minimal IR" concept that drove the design. |
| [14-technical-debt-and-limitations.md](14-technical-debt-and-limitations.md) | Known limits, deliberately-not-fixed items. |
| [15-new-plugins-spec.md](15-new-plugins-spec.md) | Historical spec — superseded by plugin READMEs. |
| [16-find-replace-plugin-spec.md](16-find-replace-plugin-spec.md) | Original FindReplace spec — see plugin README for current state. |
| [17-table-plugin-spec.md](17-table-plugin-spec.md) | Original Table spec — see plugin README for current state. |
| [18-color-picker-spec.md](18-color-picker-spec.md) | Original ColorPicker spec — see plugin README + `src/ui/ColorPicker.js`. |
| [19-image-plugin-spec.md](19-image-plugin-spec.md) | Original Image spec — see plugin README. |
| [20-public-api.md](20-public-api.md) | The public surface: `penman.*`, `editor.*`, events. |
| [21-responsive-toolbar-spec.md](21-responsive-toolbar-spec.md) | Overflow / wrap behaviour of the toolbar. |
| [23-smart-paste-spec.md](23-smart-paste-spec.md) | URL paste → auto-link behaviour. |
| [24-block-breakout-spec.md](24-block-breakout-spec.md) | Enter-to-exit behaviour inside blockquote / heading / code. |
| [cdn-example.html](cdn-example.html) | Copy-paste demo of CDN usage (one `<script>` tag). |

---

## Plugin doc template

Every plugin README follows the same layout so consumers can scan quickly:

1. **One-liner** — what it does and what it does NOT do.
2. **Activate** — minimal `penman.init(...)` snippet to turn it on.
3. **What it registers** — table of commands, buttons, dropdowns, i18n namespace, icons.
4. **Behaviour** — interesting runtime details (keyboard shortcuts, edge cases, security).
5. **Options** — config table when the plugin reads from `editor.options`.
6. **Boundaries** — explicit list of what's intentionally out of scope.

If you're authoring a new plugin, copy the layout of any existing plugin README.
