# 8. Roadmap & Limits

What's shipped, what's deferred, and the known boundaries of the current architecture. Every entry here is grounded in a real source path or a measurable migration trigger — no speculation.

## 8.1. Shipped in v0.1.0

| Area | Notes |
|---|---|
| **Core engine** | `Editor`, `EventEmitter`, lifecycle, theme system, smart paste, block breakout, textarea sync. |
| **Command system** | Custom + fallback whitelist for legacy `document.execCommand` paths (bold, italic, underline, alignment). |
| **Selection** | Save / restore, node selection, table cell-selection coordination. |
| **History** | Snapshot stack with debounced commits + `pushImmediate()` for atomic ops. EventEmitter snapshots listener list and isolates throwing listeners. |
| **Sanitizer** | Allowlist for tags, attributes, classes, inline styles, URL schemes. Defense-in-depth via `stripUnsafeAttributes` in `insertHTMLAtSelection`. |
| **UI primitives** | `Modal`, `FormModal`, `Dropdown`, `DropdownMenu`, `Tooltip`, `ColorPicker`, `FloatingUI`, responsive two-row toolbar with priority-based overflow. |
| **Dark mode** | `data-theme` + `prefers-color-scheme`. CSS variables for chrome (`--pm-*`) and content (`--pmc-*`). Live theme swap (including CodeMirror syntax theme). |
| **i18n** | Persian + English everywhere. Plugins register their own strings; the core only ships shared `core.*` / `ui.*` keys. |
| **21 plugins** | See [docs/README.md](README.md) for the table. |
| **Distribution** | npm + CDN (jsDelivr / unpkg). CSS auto-injected into the JS bundle so a single `<script>` tag is enough. UMD + ES builds. |
| **Tooling** | Vite build, Vitest test runner, jsdom environment. `TableTransaction.test.js` re-introduced the first batch of plugin tests. |

## 8.2. Known limitations

The current architecture is **DOM-as-source-of-truth**: `editor.editableArea.innerHTML` is canonical. That keeps the editor simple and small but bounds what we can do.

### History uses HTML snapshots, not semantic operations

**Status quo.** Each undo step is a full HTML snapshot plus a saved selection. Pros: simple, robust to any DOM mutation. Cons:

- **Memory** — O(snapshots × document size). A 500 KB document with 100 undo steps is ~50 MB of RAM.
- **Grouping is timer-based, not semantic.** Undo may stop mid-word because the 500 ms debounce fired between keystrokes. There's no concept of "one logical edit".
- **IME drift** — CJK composition + autocorrect on mobile occasionally interleaves with the debounce timer; in rare cases an undo step lands mid-composition.

**Migration triggers** (when we'd swap to a semantic transaction model):
- `HistoryManager.pushImmediate()` > 16 ms (one dropped frame at 60 Hz) on a mid-range device.
- Average `getContent()` > 500 KB.
- Confirmed CJK / autocorrect user reports > 2% of mobile traffic.

### No internal document model (IR)

**Status quo.** There's no JSON / AST representation of the document. The editor reads and writes HTML directly.

**Implications:**
- Cannot export documents to a structured format (JSON for mobile apps, MDX, etc.) without rewriting.
- Cannot support **collaborative editing** — operational transformation / CRDTs need a stable, addressable model. HTML strings aren't that.

**Migration trigger:** any of the above features becomes a product requirement. The historical "minimal IR" sketch (flat array of blocks with one level of inline children, UTF-16-based offsets) was the planned shape; the doc was removed in this round of consolidation because we won't build it speculatively.

### `document.execCommand` fallback path

**Status quo.** `bold`, `italic`, `underline`, `strikethrough`, alignment (`justify*`), `insertOrderedList`, `insertUnorderedList`, `indent`, `outdent` all route through the browser's deprecated `execCommand` API. Browser implementations are stable enough to ship today, but the spec is in "Sunset" status.

**Migration trigger:** any major browser ships a deprecation warning or removes the function. The replacement is hand-rolled DOM manipulation per command — non-trivial but well-isolated (each command is a separate function in `CommandManager`).

### Mobile / touch UX is functional, not optimized

**Status quo.** Toolbar buttons hit 40px+ targets. Touch tooltips do not appear (Tooltip is mouse / focus only). The grid hover-picker in TablePlugin is mouse-first. Image floating toolbar relies on hover for tooltip text.

**Migration trigger:** mobile becomes a stated product focus. The fix is incremental: long-press handler in Tooltip, touch-friendly hover-picker, tap-to-select gestures for widgets.

### No column / row resize for tables

Drag handles for column / row resize aren't implemented. Users can set widths via the Properties modal but not by direct manipulation. Implementing this means hooking pointer events on column borders and writing per-column widths through the `SET_TABLE_PROPERTIES` command — small surface, deferred to v0.2.

### Server-side rendering (SSR)

The editor's CSS auto-injection happens at runtime via the JS bundle. SSR consumers who want styled HTML before client hydration should preload `dist/penman.css` (Vite emits this separately even with the inject plugin enabled).

## 8.3. Next steps

Concrete items that could land in v0.2 without architectural changes. Listed for visibility; none are scheduled commitments.

| Idea | Effort | Why |
|---|---|---|
| Column / row resize handles in TablePlugin | M | Highest-value missing UX. |
| Inline alt-text editor on image figures | S | ContentAudit warns about missing alt but users can't fix without reopening the modal. |
| Touch / long-press support in Tooltip | S | Mobile parity. |
| Plugin authoring scaffolder CLI | S | `npx penman-editor scaffold-plugin <Name>` generates the folder + boilerplate. |
| `editor.getJSON()` (read-only AST view of the current document) | M | First step toward an IR without committing to the migration. |
| Real-time collaboration via Yjs adapter | XL | Requires the IR step first. |
| Per-plugin opt-in slice loading via `import('./plugins/X')` at register time | M | Currently every shipped plugin is bundled even if not used. Tree-shake-friendly entry. |

## 8.4. Stability commitments

What v0.1.0 promises:

- The public API documented in [`07-public-api.md`](07-public-api.md) is stable until v1.0; breaking changes to it require a major version bump.
- The plugin author contract documented in [`04-plugin-system.md`](04-plugin-system.md) is stable: shipped plugins won't have to be rewritten on minor / patch upgrades.
- The sanitizer's allowlist is conservative-by-default. If we expand it, that's a minor version. If we tighten it (could break content), that's a major version.

What v0.1.0 explicitly does NOT promise:

- Internal modules (`CommandManager`, `HistoryManager`, `Sanitizer` internals) are free to change. Don't depend on them from outside.
- CSS class names that don't start with `penman-` (none exist today) are not part of the API.
- The flagging behaviour of ContentAuditPlugin rules — rule weights, severity thresholds, and individual rule code names may evolve as we gather feedback.

## 8.5. Tracking issues

Open at <https://github.com/fariborzj2/penman/issues>. Use the labels:

- `type: bug`, `type: feat`, `type: docs`.
- `security` for vulnerability reports (please describe the unsafe input, not a full PoC, in the public issue; the maintainer will reach out for details).
- `plugin: <name>` for plugin-specific issues.
- `breaking` to flag a fix that would need a major bump.
