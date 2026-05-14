# Changelog

All notable changes to **penman-editor** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-14

First public release.

### Added

- **Modular plugin architecture** — every plugin is a self-contained folder
  (`plugins/<Name>/index.js` + `lang/{fa,en}.js` + `icons/index.js`).
  Removing a plugin folder removes all its strings, icons, and toolbar entries
  cleanly with no orphan references.
- **Plugin registration APIs**
  - `editor.i18n.register(namespace, { fa, en, ... })` — merges per-plugin
    translations into the live dictionaries at runtime.
  - `editor.ui.iconProvider.register(icons)` — same pattern for SVG icons.
- **FormModal API** — `editor.ui.createFormModal({ title, fields, onSubmit })`
  with a declarative field schema (text, url, email, number, textarea, select,
  checkbox, radio, hidden, row, section, html, custom). Auto-collects values,
  per-field validation, and an `onSubmit(data)` callback.
- **DropdownMenu API** — `buildDropdownMenu(editor, { items, searchable })`
  with item / separator / header / section / custom types, optional search
  bar, and full ARIA role wiring (`role="menu"` / `role="menuitem"`).
- **Dark theme** — opt in via `editor.setTheme('dark' | 'light' | 'auto')` or
  the `theme` init option. Follows `prefers-color-scheme` when set to `auto`.
  Manual choice overrides system preference. Variable-driven CSS so every
  component (toolbar, modals, dropdowns, content area, code highlighting)
  re-themes in unison.
- **Themed tooltip service** (`src/ui/Tooltip.js`) — opt-in via
  `data-tooltip="..."` on any element. Shows after 250 ms hover delay, with
  optional `data-tooltip-shortcut` rendering a keyboard pill. Hides on click,
  scroll, blur, or Escape. Wired automatically to every toolbar button by
  UIManager.
- **HelpPlugin** — `plugins: ['help']` adds a toolbar button + `F1` shortcut
  that opens a categorized help dialog (keyboard shortcuts, Markdown
  shortcuts, tips, About). Strings are i18n.
- **Shared utilities**
  - `src/utils/html.js` — single `escapeHtml`, `escapeHtmlAttr`, `safeUrl`
    (rejects `javascript:`/`vbscript:`/`file:`/`data:text/*`), and
    `stripUnsafeAttributes` defense-in-depth helper.
  - `src/utils/platform.js` — `isMac()` and `modKey()` (returns `⌘` on Apple
    platforms, `Ctrl` elsewhere).
- **`editor.on('themeChange', ...)`** event for code that needs to react to
  manual theme changes (e.g. CodeMirror swapping syntax-highlight theme).
- **EventEmitter.once()** for one-shot listeners; emit now snapshots the
  listener list and isolates throwing listeners.

### Changed

- **Table dropdown** redesigned with cascading flyout submenus — 4 parent
  items (Cell, Row, Column, Table) instead of a flat 11-row list, cutting
  vertical footprint by ~⅔.
- **INSERT_TABLE** now emits a normalized structure
  (`<thead><th>...</th></thead><tbody><td>...</td></tbody>`) matching the
  sanitizer's output — no more first-row promotion shock on paste round-trip.
- **Table cells** no longer carry inline border/padding styles or
  `border="1"` / `bordercolor="#ccc"` attributes. Borders come from
  `penman-content.css` via `var(--pmc-border)` so they adapt to theme.
- **Cell merge** now skips visually-empty cells (those containing only
  `<p><br></p>` or whitespace) so merging blank cells doesn't produce stacked
  empty paragraphs.
- **CodeMirror dark syntax** — when the editor is in dark mode, source-code
  modal applies `@codemirror/theme-one-dark` so keyword/string/number tokens
  remain readable on the dark background. Live-swaps on theme change.
- **Toolbar buttons** show themed tooltips with keyboard shortcuts instead
  of native browser title popovers.
- **UIManager button state updates** are now coalesced via
  `requestAnimationFrame` and only mutate the DOM when the active state
  actually changes — eliminating per-keystroke DOM churn on busy toolbars.
- **Image floating toolbar** strings (`Align Left`, `Edit image`, etc.) now
  go through `editor.i18n` instead of being hardcoded English.

### Security

- Consolidated 6+ ad-hoc `escapeHtml` implementations into
  `src/utils/html.js`. Escape semantics are now uniform across plugins.
- `safeUrl()` validates every URL passed through `LinkPlugin` and
  `SuggestedPostsPlugin`, blocking `javascript:`/`vbscript:`/`data:text/*`
  and unknown schemes.
- `insertHTMLAtSelection` (used by paste, markdown auto-conversion, etc.)
  now strips `on*` event-handler attributes and validates URL-bearing
  attributes via `safeUrl()` as a defense-in-depth layer beyond the
  sanitizer.

### Removed

- Stray plugin files at `src/plugins/` root (LinkPlugin.js, ListPlugin.js,
  HorizontalRulePlugin.js, …) moved into their own folders.
- Per-plugin `*.test.js` files (a deliberate clean-up; plugin tests will be
  restored progressively — see [#57] for the first batch on
  `TableTransaction`).

### Accessibility

- `Dropdown` trigger now exposes `aria-haspopup="menu"`, `aria-expanded`;
  the panel has `role="menu"`. Arrow Down opens the panel and focuses the
  first item, Escape closes and returns focus to the trigger.
- `DropdownMenu` items render with `role="menuitem"`, plus `aria-checked`
  for active items and `aria-disabled` for disabled ones.
- Image floating toolbar buttons now carry `aria-label` and themed
  `data-tooltip` instead of native `title=` attributes.

### Tooling / Repo

- LICENSE (MIT) added at repo root.
- README refreshed for v0.1 features.
- `.gitignore` and `.npmignore` clean up working files from the published
  package and from git history.
- **CDN distribution** — `dist/penman.umd.js` bundles CSS into JS via
  `vite-plugin-css-injected-by-js`. A single `<script src=".../penman.umd.js">`
  on jsDelivr / unpkg is enough to get a fully styled editor — no separate
  stylesheet link. `package.json` exposes `unpkg`, `jsdelivr`, and `browser`
  fields. `docs/cdn-example.html` ships a copy-paste demo.
