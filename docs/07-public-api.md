# 7. Public API

The complete public surface for application code: `penman.*` (the registry) and `editor.*` (instances). Everything else is internal and can change between versions.

## 7.1. The `penman` registry

```js
import penman from 'penman-editor';
```

| Method | Returns | Description |
|---|---|---|
| `penman.init(options)` | `Editor \| Editor[]` | Initialise one or more editors. Returns a single instance for a single match, an array when the selector matches multiple elements. |
| `penman.get(selectorOrId)` | `Editor \| null` | Look up an instance by CSS selector or textarea `id`. |
| `penman.getByElement(textarea)` | `Editor \| null` | Look up by the original `<textarea>` element. |
| `penman.getByName(name)` | `Editor \| null` | Look up by the textarea's `name` attribute. |
| `penman.getAll()` | `Editor[]` | Every initialized editor on the page. |
| `penman.remove(targetOrEditor)` | `void` | Remove an instance from the registry (calls `destroy()`). |
| `penman.PluginManager` | object | Plugin registry. Call `.add(name, setupFn)` to register a third-party plugin before `init`. |
| `penman.defaults` | object | Read-only default options object. |

## 7.2. `penman.init` options

```ts
penman.init({
  // Required — CSS selector or element.
  selector: string | HTMLTextAreaElement,

  // Optional — see "Per-element configuration" below for multiple editors.
  resolveConfig?: (element, defaultConfig) => Partial<Options>,

  // Editor surface
  toolbar?: string | { rows: ToolbarRow[] },
  height?: number,                    // default 300
  direction?: 'rtl' | 'ltr' | 'auto', // default 'auto'
  lang?: 'fa' | 'en' | string,        // default depends on direction
  theme?: 'dark' | 'light' | 'auto',  // default 'auto'

  // Content
  plugins?: string[],                 // names from PluginManager.plugins
  blockTypes?: BlockType[],           // overrides BlockTypePlugin defaults

  // Plugin-specific options
  imageUploadFn?: (file: File, onProgress?: (loaded, total) => void)
                  => Promise<{ url: string, alt?: string }>,
  draftDocumentId?: string,           // required for DraftPlugin
  fontSizes?: string[],               // default ['12px', '14px', '16px', '18px', '24px', '32px']
  auditIgnoreH1?: boolean,            // ContentAuditPlugin: skip "needs H1" rule

  // a11y
  ariaLabel?: string                  // overrides automatic editor label
});
```

### Per-element configuration

When a selector matches multiple elements (e.g. `.editor`), `resolveConfig(el, defaultConfig)` is called for each. Return a merged config:

```js
penman.init({
  selector: '.editor',
  config: { plugins: ['format', 'link', 'image'] },
  resolveConfig: (el, defaultConfig) => ({
    ...defaultConfig,
    height: parseInt(el.dataset.height, 10) || 300,
    direction: el.dataset.direction || 'auto',
    lang: el.dataset.direction === 'rtl' ? 'fa' : 'en'
  })
});
```

## 7.3. The `Editor` instance

```js
const editor = penman.init({ selector: '#post-body', plugins: [...] });
```

### Content I/O

| Method | Returns | Description |
|---|---|---|
| `editor.getContent()` | `string` | Sanitized HTML, with editor-only attributes (selection markers, cell ids, transaction descriptors) stripped. Safe to persist. |
| `editor.setContent(html)` | `void` | Replace the editable area. Input is sanitized before insertion. |
| `editor.insertContent(html)` | `void` | Insert at the current caret. Goes through `insertHTMLAtSelection` which strips `on*` handlers and validates URLs. |
| `editor.focus()` | `void` | Move focus into the editable area. |

### Theming

| Method | Description |
|---|---|
| `editor.setTheme('dark' \| 'light' \| 'auto')` | Set `data-theme` on the wrapper. Emits `themeChange`. |
| `editor.getTheme()` | Returns the current setting. |

### Commands & events

| Method | Description |
|---|---|
| `editor.execCommand(name, value?)` | Run a registered command. Both built-in and plugin commands are reachable through here. |
| `editor.commands.register(name, { queryState, execute })` | Register a new command at runtime (rarely needed — plugins do this in their setup). |
| `editor.commands.queryState(name)` | Returns the active state for a command (used by the toolbar to highlight active buttons). |
| `editor.on(event, fn)` | Subscribe to an event. |
| `editor.once(event, fn)` | One-shot subscription. |
| `editor.off(event, fn)` | Unsubscribe. Removes wrappers added via `once()` as well. |
| `editor.emit(event, ...args)` | Manually fire an event. |

### Lifecycle

| Method | Description |
|---|---|
| `editor.destroy()` | Detach all listeners, run every plugin's `destroy` handler, remove the wrapper, restore the original textarea. After destroy, every method becomes a no-op. |

### Events catalog

| Event | Payload | Fired by |
|---|---|---|
| `init` | `editor` | Editor after plugins finish setup. |
| `change` | `html: string` | After every history-snapshotted edit. |
| `selectionChange` | — | On every browser `selectionchange` (and after our own `restore()`). |
| `nodeSelected` | `node: HTMLElement \| null` | SelectionManager when a widget gets selected. |
| `themeChange` | `theme: 'dark' \| 'light' \| 'auto'` | `setTheme()`. |
| `beforePaste` | `{ text, html, preventDefault() }` | Paste handler. Plugins (e.g. MarkdownPlugin) intercept here. |
| `destroy` | — | `destroy()`. Plugins detach their global listeners. |

## 7.4. Plugin sub-APIs

A handful of plugins attach a namespaced API to the editor instance.

| Plugin | Namespace | Methods |
|---|---|---|
| ImagePlugin | `editor.image` | `insertFromURL(url, alt?)`, `insertUntrustedURL(url, alt?)`, `gallery.registerSource({ id, name, trustLevel, list, get })`. |
| MediaPlugin | `editor.media` | `insertNode(data)`, `updateNode(node, data)`, `providers.register(provider)`. |
| EmbedPlugin | `editor.embed` | `insertNode(html)`. |
| TablePlugin | `editor.tableSelectionManager` | Internal cell-selection state (read-only from outside the plugin). |

See each plugin's README for full signatures.

## 7.5. Type definitions

`src/index.d.ts` ships with the npm package and covers `penman.init`, the `Editor` class, options, events, and the `BlockType` / `ToolbarRow` shapes. TypeScript consumers get autocomplete + compile-time safety without any extra setup.

## 7.6. Versioning

The package follows [SemVer](https://semver.org/):

- **Patch** — bug fixes, internal refactors. Safe to upgrade.
- **Minor** — new plugins, new optional fields in `init` options, new events. Existing code keeps working.
- **Major** — breaking change to any method or event listed in this document.

Internal APIs (anything not in this file) can change in any release.

## 7.7. Stability notes

Stable since v0.1.0:
- The `penman.*` registry methods.
- All `editor.*` methods listed above.
- The events catalog.

Likely to evolve:
- `editor.commands.fallbackWhitelist` (internal — subject to change).
- Per-plugin sub-APIs (`editor.image`, `editor.media`) may add new methods; existing methods remain stable.
- CSS variable names — additions are safe; removals will be marked in the CHANGELOG.
