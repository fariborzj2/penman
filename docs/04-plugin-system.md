# 4. Plugin System

A plugin is a JavaScript module that exports a single `setup(editor)` function. The function runs once at editor initialization and can register commands, toolbar items, translations, icons, and event listeners. Twenty-one plugins ship with the editor; the same conventions apply to any plugin you write yourself.

## 4.1. Plugin folder shape

```
src/plugins/MyPlugin/
├── index.js              ← exports setupMyPlugin(editor)
├── lang/
│   ├── fa.js
│   └── en.js
├── icons/
│   └── index.js
├── styles/               (optional — only if the plugin needs custom CSS)
│   └── my-plugin.css
└── tests/                (optional)
```

Every shipped plugin follows this layout. Removing the folder removes the plugin entirely; there are no per-plugin entries in centralized files.

## 4.2. The registration contract

Inside `setup(editor)`, a plugin opts in to four registration points:

```js
import faStrings from './lang/fa.js';
import enStrings from './lang/en.js';
import icons from './icons/index.js';

export function setupMyPlugin(editor) {
  // 1. Translations — deep-merged into the live i18n dictionaries.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.myPlugin', { fa: faStrings, en: enStrings });
  }

  // 2. Icons — registered with the central IconProvider so the toolbar can
  //    pick them up by name.
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(icons);
  }

  // 3. Commands — exposed via editor.execCommand(...).
  editor.commands.register('MY_PLUGIN_INSERT', {
    queryState: (ed) => false,
    execute:    (ed, value) => { /* mutate DOM */ }
  });

  // 4. Toolbar — buttons (and/or dropdowns) referenced by name in
  //    options.toolbar.
  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('myplugin', {
      text: editor.i18n.t('plugins.myPlugin.buttonLabel'),
      ariaLabel: editor.i18n.t('plugins.myPlugin.buttonLabel'),
      shortcut: 'Ctrl+Shift+M',   // optional — shown in the themed tooltip
      onAction: () => editor.execCommand('MY_PLUGIN_INSERT')
    });
  }

  // 5. Event listeners — clean them up on editor.on('destroy', ...).
  const keyHandler = (e) => { /* ... */ };
  editor.editableArea.addEventListener('keydown', keyHandler);
  editor.on('destroy', () => {
    editor.editableArea.removeEventListener('keydown', keyHandler);
  });
}
```

Each of these calls is **defensive**: it checks the API exists before using it. The guards make plugins testable in isolation without the full editor instance.

## 4.3. Registering with `PluginManager`

`src/plugins/PluginManager.js` is the central directory. It exports an object `PluginManager.plugins` mapping short names (used in `options.plugins`) to setup functions. To make a plugin discoverable:

```js
// src/plugins/PluginManager.js
import { setupMyPlugin } from './MyPlugin/index.js';

export const PluginManager = {
  plugins: {
    // ... existing plugins ...
    myplugin: setupMyPlugin
  },
  add(name, setup) { this.plugins[name] = setup; },
  init(editor) {
    const pluginList = this._normalizePluginList(editor.options?.plugins);
    pluginList.forEach(name => {
      const setup = this.plugins[name];
      if (typeof setup === 'function') setup(editor);
      else logger.warn(`Plugin "${name}" is not registered.`);
    });
  }
};
```

Third-party plugins can register at runtime without editing this file:

```js
import { setupMyPlugin } from './MyPlugin/index.js';
penman.PluginManager.add('myplugin', setupMyPlugin);

const editor = penman.init({ selector: '#editor', plugins: ['myplugin', ...] });
```

## 4.4. i18n conventions

- Namespace: `plugins.<pluginName>` (camelCase). Example: `plugins.findReplace`.
- Files: `lang/fa.js`, `lang/en.js` exporting a default object. Nested objects are fine.
- Every user-facing string lives in i18n. No hardcoded English in plugin code.
- The shared `src/i18n/locales/{fa,en}.js` only contains core (toolbar fallback) and UI primitives (`ui.cancel`, `ui.ok`, `ui.close`, etc.). Plugins do NOT add keys there.

Adding a new language: implement `editor.i18n.register('plugins.myPlugin', { de: { ... }, fa: ..., en: ... })`. The I18nManager auto-creates the slot.

## 4.5. Icon conventions

- File: `icons/index.js`.
- Export shape: `{ [iconName: string]: svgString }`.
- SVG: 18×18 viewBox, `stroke="currentColor"`, `fill="none"`. The toolbar's button colors cascade via `currentColor`, so the icon picks up active / hover state automatically.
- Names should match the toolbar button name (`myplugin`) so `UIManager._createButton` can find them by command name.

## 4.6. Modal / Dropdown UI

Use the standardized primitives in `src/ui/`:

| Need | Primitive | File |
|---|---|---|
| Form modal with fields | `editor.ui.createFormModal({ title, fields, onSubmit })` | `src/ui/FormModal.js` |
| Plain modal with custom body | `editor.ui.createModal({ title, body, ... })` | `src/ui/Modal.js` |
| Items dropdown | `buildDropdownMenu(editor, { items, searchable })` | `src/ui/DropdownMenu.js` |
| Custom-content dropdown panel | `editor.ui.createDropdown({ ... })` | `src/ui/Dropdown.js` |
| Color picker | `new ColorPicker({ onChange })` | `src/ui/ColorPicker.js` |
| Floating toolbar (anchored bubble) | `new FloatingUI(editor, { offset, placement })` | `src/ui/FloatingUI.js` |

See [`06-ui-system.md`](06-ui-system.md) for each primitive's API. Prefer them over rolling your own — they handle dark mode, ARIA, RTL, and keyboard navigation consistently.

## 4.7. Author rules

These are non-negotiable for plugins shipped with the editor and recommended for third-party plugins.

1. **No global side effects.** Every listener, observer, and DOM injection happens inside `setup()` and is torn down on `editor.on('destroy', ...)`. The editor must be embed-able multiple times on the same page.
2. **Use `editor.i18n.t(...)`.** No hardcoded English. The audit script will flag plugins that bypass i18n.
3. **Sanitize before insertion.** Use `editor.insertContent(html)` — that path runs the sanitizer + `stripUnsafeAttributes()`. If you call `editor.editableArea.appendChild(...)` directly, you skip both.
4. **Use `safeUrl()` for user-provided URLs.** Imported from `../../utils/html.js`. Don't write your own scheme validator.
5. **Push to history on structural changes.** Call `editor.history.pushImmediate()` right after a mutation that the user should be able to undo as one step.
6. **Restore selection before insertion.** Anything that opens a modal first calls `editor.selection.save()`; the submit handler calls `editor.selection.restore()` before mutating.
7. **Mind the public surface.** Don't expose internal state on `editor` unless you intend it to be public API. Use a single namespaced object, e.g. `editor.image = { ... }`.
8. **Themed tooltips.** Pass `data-tooltip` on any button you build yourself; the editor's global Tooltip service picks it up. Don't use the native `title` attribute.
9. **Document your plugin.** Add a `docs/<PluginName>/README.md` following the template in any of the shipped plugins.

## 4.8. Testing a plugin

The editor's test layout (vitest + jsdom) extends to plugins:

- Place test files inside `src/plugins/<PluginName>/` with `.test.js` suffix; `vitest.config` picks them up automatically.
- Use `// @vitest-environment jsdom` at the top of each file.
- Build a minimal fake editor object that exposes only what your plugin reads. The `TableTransaction.test.js` file in `src/plugins/TablePlugin/` is a good template.

Test files are excluded from the published package via the `files` whitelist negation patterns in `package.json`, so test code never ships to consumers.
