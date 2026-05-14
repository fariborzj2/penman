# 2. Architecture

This document is the source of truth for the editor's high-level layers, folder layout, and runtime data flow. Every claim here is grounded in `src/`.

## Layers (top to bottom)

```
┌──────────────────────────────────────────────────────────────┐
│  PLUGINS                                                     │
│  Each plugin folder is self-contained:                       │
│  - index.js (setup function)                                 │
│  - lang/{fa,en}.js                                           │
│  - icons/index.js                                            │
│  Plugins register commands, toolbar items, and i18n strings  │
│  at setup() time. They never touch each other's state.       │
└──────────────────────────────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  CORE (src/core/Editor.js)                                   │
│  Owns lifecycle: init → mount UI → run plugins → wire events │
│  → tear down on destroy. Holds the EventEmitter mixin.       │
└──────────────────────────────────────────────────────────────┘
   ▲              ▲              ▲              ▲             ▲
   │              │              │              │             │
┌──────┐  ┌──────────┐  ┌─────────────┐  ┌───────────┐  ┌────────────┐
│ UI   │  │ Commands │  │ Selection   │  │ History   │  │ Sanitization│
└──────┘  └──────────┘  └─────────────┘  └───────────┘  └────────────┘
```

| Layer | Folder | Responsibility |
|---|---|---|
| Plugins | `src/plugins/` | Extension points. Twenty-one shipped; see [`README.md`](README.md). |
| Core engine | `src/core/Editor.js`, `src/core/EventEmitter.js` | Editor class, init/destroy, event bus. |
| UI primitives | `src/ui/` | `UIManager`, `Modal`, `FormModal`, `Dropdown`, `DropdownMenu`, `Tooltip`, `ColorPicker`, `FloatingUI`, `IconProvider`, `toolbar/` subsystem. |
| Commands | `src/commands/CommandManager.js` | `register()` / `execute()` / `queryState()`, fallback whitelist. |
| Selection | `src/selection/SelectionManager.js` | save/restore, node selection, integration with table cell-selection. |
| History | `src/history/HistoryManager.js` | Snapshot stack, debounced commits, `pushImmediate()` for atomic ops. |
| Sanitization | `src/sanitization/Sanitizer.js` (+ helpers) | Allowlist-driven HTML cleanup. |
| i18n | `src/i18n/I18nManager.js` | Plain-string lookup with deep-merge `register()` for plugin strings. |
| Utilities | `src/utils/` | `html.js` (escape + safeUrl), `platform.js` (isMac/modKey), `logger.js`, `uniqueId.js`, `domCommands.js`. |
| Styles | `src/styles/` | `penman-ui.css` (chrome), `penman-content.css` (editable area), Vazirmatn font. |

## Initialization sequence

`new Editor(options)` runs the following synchronously inside `_createUI()` plus the surrounding setup:

1. **Locate the textarea** — `document.querySelector(options.selector)` or accept an element. Throws if not found.
2. **Build the wrapper DOM** — `<div class="penman-wrapper" dir="...">` containing `<div class="penman-editor-area" contenteditable="true">`. The original `<textarea>` is hidden via `style.display="none"`.
3. **Initial theme** — `setTheme(options.theme || 'auto')` writes `data-theme` on the wrapper.
4. **Set up the four managers** — `I18nManager`, `SelectionManager`, `HistoryManager`, `Sanitizer` (constructed in this order; later ones may read from earlier).
5. **Build the `UIManager`** — installs the shared `Tooltip` listener, builds the toolbar registry, but defers rendering.
6. **Run `PluginManager.init(editor)`** — iterates `editor.options.plugins`, looking each name up in the `PluginManager.plugins` map. Plugins register commands / buttons / i18n strings now.
7. **Render the toolbar** — `UIManager.render()` reads `options.toolbar`, asks each registry entry to draw its button or dropdown, and inserts the toolbar above the editable area.
8. **Wire events** — paste, keydown, input, selectionchange. The internal `keydown` handler covers undo/redo, breakout (Ctrl/⌘+Enter), find shortcut (Ctrl/⌘+F), arrow navigation around widgets.
9. **Hydrate** — initial content is read from the textarea, passed through `Sanitizer`, and written to the editable area.
10. **Emit `init`** — plugins or host code can subscribe to take post-init action.

`destroy()` reverses this: detaches global listeners, fires the `destroy` event so plugins (e.g. `HelpPlugin`'s F1 listener) can clean up their own bindings, removes the wrapper, restores the original textarea, then drops references.

## End-to-end command flow

When the user clicks a toolbar button (say **Bold**):

1. `UIManager` button's click handler calls `editor.execCommand('bold')`.
2. `CommandManager.execute()` looks up the registered command.
3. The command runs `SelectionManager.save()` then mutates the DOM (here: wraps / unwraps `<strong>` around the range). For commands without a registered handler, the manager falls back to `document.execCommand` via its whitelist.
4. `CommandManager._normalizeDOM()` runs to flatten legacy tags (`<b>` → `<strong>`, `<i>` → `<em>`, `<strike>` → `<s>`).
5. `SelectionManager.restore()` puts the caret back.
6. `HistoryManager.pushImmediate()` snapshots the result.
7. `editor.emit('change', html)` is fired. The textarea sync listener writes the new content; UI listeners refresh the active-state of every button via the rAF-coalesced `_updateButtonStates()`.

## Plugin registration flow

Each plugin's `setup(editor)` runs once at init time. The canonical pattern (used by every shipped plugin):

```js
export function setupFooPlugin(editor) {
  editor.i18n.register('plugins.foo', { fa: faStrings, en: enStrings });
  editor.ui.iconProvider.register(icons);

  editor.commands.register('FOO_DO_THING', {
    queryState: () => false,
    execute: (editor) => { /* DOM mutation */ }
  });

  editor.ui.registry.addButton('foo', {
    text: editor.i18n.t('plugins.foo.buttonLabel'),
    onAction: () => editor.execCommand('FOO_DO_THING')
  });
}
```

Plugin authoring rules and the full lifecycle are in [`04-plugin-system.md`](04-plugin-system.md).

## Cross-cutting concerns

- **Sanitization** runs at three boundaries: `setContent()`, paste, source-view apply. Everything that flows into the editable area passes through it once. See [`05-security.md`](05-security.md).
- **Selection** is preserved across toolbar interactions via `save()` / `restore()` because clicking a button moves browser focus off the editable area. Plugins that open modals call `save()` on open and `restore()` on submit. See `src/selection/SelectionManager.js`.
- **History** uses HTML-string snapshots (not Mutation-based deltas) — a deliberate trade-off documented in [`08-roadmap-and-limits.md`](08-roadmap-and-limits.md).
- **EventEmitter** snapshots its listener list before dispatch so a listener can safely `off()` itself during the call. Throwing listeners are isolated via `logger.warn` so one bad handler doesn't break the chain.
