# 3. Core Engine

The internals that make the editable area behave like an editor — selection, commands, history, and the special-case behaviors that ride on top (smart paste, block breakout). Every subsystem here lives in `src/core/` or its sibling folders.

## 3.1. The `Editor` class

`src/core/Editor.js` is the entry point. It mixes in `EventEmitter` and exposes the public API documented in [`07-public-api.md`](07-public-api.md). Internally it owns:

| Property | Type | Purpose |
|---|---|---|
| `editor.options` | object | Resolved init options. |
| `editor.container` | `HTMLDivElement` | `.penman-wrapper` root. |
| `editor.editableArea` | `HTMLDivElement` | `[contenteditable="true"]`. The DOM the user types into. |
| `editor.textarea` | `HTMLTextAreaElement` | Original element, kept hidden, synced on `change`. |
| `editor.i18n` | `I18nManager` | Translations. Plugins extend via `editor.i18n.register()`. |
| `editor.selection` | `SelectionManager` | Save / restore / node operations. |
| `editor.history` | `HistoryManager` | Undo / redo stack. |
| `editor.commands` | `CommandManager` | Registry of editing operations. |
| `editor.ui` | `UIManager` | Toolbar, modals, dropdowns, tooltip, icons. |
| `editor.sanitizer` | `Sanitizer` | Allowlist HTML cleaner. |
| `editor.theme` | `'dark' \| 'light' \| 'auto'` | Current value set by `setTheme()`. |

Plugins additionally attach namespaces (`editor.image`, `editor.media`, `editor.tableSelectionManager`) — those are documented in the respective plugin READMEs.

### Events emitted by the editor

| Event | When | Payload |
|---|---|---|
| `init` | After plugins finished setup. | `editor` |
| `change` | Content changed (after a history-snapshotted edit). | `html: string` |
| `selectionChange` | Caret or range moved. | — |
| `nodeSelected` | A widget (image figure, embed, table) was selected. | `node: HTMLElement \| null` |
| `themeChange` | `setTheme()` was called. | `theme: string` |
| `beforePaste` | Paste intercepted, before content enters. | `{ text, html, preventDefault() }` |
| `destroy` | `destroy()` called. | — |

## 3.2. Selection (`src/selection/SelectionManager.js`)

The editor's selection is whatever `window.getSelection()` reports — there is no virtual selection model. `SelectionManager` is a thin façade that adds three guarantees plain `Selection` doesn't give:

- **`save()` / `restore()`** — Stores the active range in memory so it survives focus loss. When the user clicks a toolbar button, the editable area blurs; we'd lose the caret if we didn't snapshot it first. `clearSaved()` discards the stored range when no longer needed.
- **Node selection** — `selectNode(el)` selects a whole widget (an image figure, an embed). Tracked via the `nodeSelected` event so plugins can show floating toolbars on the right thing.
- **Cell selection coordination** — `TablePlugin` plugs its own `TableSelectionManager` into the editor for multi-cell rectangular selection. When cell selection is active, formatting commands (bold etc.) route through it via `editor.execCommand` interception.

`SelectionManager` does NOT model marker spans in the DOM (that approach exists historically — see the technical-debt section). All current state lives in JavaScript Range objects.

## 3.3. Command system (`src/commands/CommandManager.js`)

A flat registry. Each command has three optional callbacks:

```js
editor.commands.register('FOO', {
  queryState: (editor) => false,   // true when this command's state is "on"
  execute:    (editor, value) => { /* mutate DOM */ }
});
```

### Built-in vs plugin commands

- **Built-in** — alignment (`justifyleft`/`center`/`right`/`full`) and undo/redo are wired directly into the keydown handler in `Editor.js`. They use `document.execCommand` under the hood because the browser's native alignment is more reliable than a hand-rolled implementation.
- **Plugin commands** — every named `editor.commands.register(...)` call. The audit at `/tmp/plugins-audit.json` enumerates them per plugin; see [docs/README.md](README.md) for the consolidated table.

### Fallback whitelist

`CommandManager.fallbackWhitelist` lists commands that route through the native `document.execCommand` if no custom handler is registered. This is the seam used by `TablePlugin` to intercept formatting commands when cell selection is active: instead of running the native command on the whole document, it applies the format to each selected cell individually.

### `queryState`

Called from `_updateButtonStates()` on every `selectionChange` (rAF-coalesced). Returns:
- `true` — button gets `.penman-btn-active` and `aria-pressed="true"`.
- `false` — button is inactive.
- A truthy non-boolean (e.g. a string for font-size or block-type) — the button's label is updated to that value.

## 3.4. History (`src/history/HistoryManager.js`)

A simple snapshot-based undo stack.

### What a snapshot is

A snapshot is an object `{ html, selection }` where `html` is the editable area's `innerHTML` after sanitization-safe cleanup and `selection` describes the saved caret position so undo lands the cursor back where the user was.

### Commit strategy

Two paths:

| Path | When | Trigger |
|---|---|---|
| **Debounced** | Continuous typing. | The keydown handler schedules a commit after ~500 ms of idle. Multiple keystrokes coalesce into one undo step. |
| **Immediate** | Structural changes. | `pushImmediate()` runs right after the mutation. Used by every plugin command (paste, insert image, merge cells, etc.) so each is its own undo step. |

### Undo / redo

`Ctrl/⌘+Z` and `Ctrl+Y` (or `⌘+Shift+Z` on macOS) are caught at the editor level (`preventDefault` so the browser doesn't run its own undo, which would corrupt the snapshot stack). The handler pops a snapshot, applies its `html`, then restores its `selection`.

### Known limits

History uses full HTML snapshots, not semantic operations. The implications (memory growth, non-word-aware grouping, IME interactions) are documented in [`08-roadmap-and-limits.md`](08-roadmap-and-limits.md).

## 3.5. Smart paste

When the user pastes content into a paragraph, the browser's native `insertHTML` tends to split the block instead of merging the paste into it — a paragraph pasted into another paragraph becomes two paragraphs. The editor intercepts the `paste` event and:

1. Reads the clipboard via `event.clipboardData.getData('text/html')` and `getData('text/plain')`.
2. Emits a `beforePaste` event so plugins (e.g. `MarkdownPlugin`) can preempt with their own conversion.
3. Runs the HTML through the sanitizer.
4. If the caret is collapsed inside a mergeable block (`p`, `h1`–`h6`, `blockquote`, `li`), it unwraps the leading and trailing block of the pasted fragment so the paste merges into the host block rather than splitting it. Complex widgets (tables, figures) are not unwrapped.
5. Inserts the cleaned HTML via `domCommands.insertHTMLAtSelection` (which additionally strips `on*` event handlers and unsafe URLs as a defense-in-depth pass).
6. Snapshots history via `pushImmediate()`.

If the pasted text is a URL and there's an active text selection or a selected widget, the editor instead wraps the selection in `<a href="…">` — the "magic paste" link wrap. `MarkdownPlugin` is selection-aware too: it yields to the link wrap when both conditions match.

## 3.6. Block breakout

`Ctrl/⌘+Enter` exits the current top-level block container into a fresh paragraph below.

- "Top-level" means the immediate child of `editor.editableArea`. So a `<p>` inside a `<blockquote>` resolves to the blockquote.
- A new `<p><br></p>` is inserted *after* that top-level block.
- The caret moves into the new paragraph.
- A snapshot is committed via `pushImmediate()`.

This rule applies to every block including code blocks (`<pre>`), tables, figures, embeds — anywhere the user could otherwise get "stuck". Pressing plain Enter inside code blocks still inserts a newline (handled by `CodeBlockPlugin`); breakout is the keyboard exit.

## 3.7. textarea synchronization

After every `change` event the editor calls `_syncToTextarea()`, which writes the sanitized HTML to the hidden `<textarea>`. Form submits therefore POST the same content the user sees — without the host page needing any extra integration code.

## 3.8. Lifecycle hooks

| Hook | Use case |
|---|---|
| `editor.on('init', fn)` | Run after plugins finished setup but before user typing. Good place to call `editor.setContent(...)`. |
| `editor.on('change', fn)` | Persist to backend, debounce server save, etc. |
| `editor.on('themeChange', fn)` | Swap a non-editor widget on the page that should match the editor's theme. |
| `editor.on('destroy', fn)` | Plugin teardown. Every shipped plugin uses this to detach its global keyboard listeners. |
