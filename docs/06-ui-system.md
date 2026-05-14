# 6. UI System

The chrome that surrounds the editable area: toolbar, modals, dropdowns, tooltip, color picker, floating widgets. Every primitive lives in `src/ui/` and is themable via CSS variables. Dark mode and RTL come "for free" — primitives don't need plugin-side adaptations.

## 6.1. UIManager

`src/ui/UIManager.js` is the surface area plugins see via `editor.ui`. It owns:

| Field | Purpose |
|---|---|
| `editor.ui.iconProvider` | Central icon registry (`register(icons)`, `getIcon(name)`). |
| `editor.ui.registry` | Toolbar buttons + dropdowns (`addButton(name, cfg)`, `addDropdown(name, cfg)`). |
| `editor.ui.createModal(options)` | Imperative modal (for highly custom UIs). |
| `editor.ui.createFormModal(options)` | Declarative form modal (preferred). |
| `editor.ui.createDropdown(options)` | Bare dropdown primitive (a button + a panel). |

`UIManager` also installs the global `Tooltip` listener (idempotent) so every `data-tooltip` attribute on the page works.

## 6.2. Toolbar

`src/ui/toolbar/` contains the responsive toolbar subsystem. It can render in two ways:

### Legacy string form

```js
toolbar: 'undo redo | bold italic underline | link image | sourcecode'
```

A single row. Pipe `|` becomes a visual separator. Each token must correspond to a registered button or dropdown name.

### Structured row form (recommended)

```js
toolbar: {
  rows: [
    ['undo', 'redo', 'blocktype', 'fontsize', 'image', 'table', 'sourcecode', 'help'],
    [
      { name: 'bold', priority: 100 },
      { name: 'italic', priority: 95 },
      { name: 'link', priority: 80 },
      { name: 'textcolor', priority: 30 }
    ]
  ]
}
```

Up to two distinct rows are supported. Within a row, items with lower `priority` are the first to be moved into an overflow `(...)` dropdown when the toolbar runs out of width. Without explicit priority, order is right-to-left (rightmost overflow first).

### Modules

| Module | Responsibility |
|---|---|
| `ToolbarRenderer` | Reads the config, instantiates rows, mounts the result above the editable area. |
| `RowLayoutManager` | Owns one row's DOM and delegates measurement to `OverflowEngine`. |
| `OverflowEngine` | Width-aware: measures items, decides which overflow, runs DOM changes in a single batch. |
| `PriorityResolver` | Sorts items by priority for overflow decisions. |
| `ResizeHandler` | `ResizeObserver` wrapper with debouncing — re-runs overflow only on actual size changes. |
| `DropdownController` | The `(...)` overflow dropdown. |

### Active state

`UIManager._updateButtonStates()` runs on every `selectionChange`, coalesced via `requestAnimationFrame`. For each button with a `data-cmd`, it calls `editor.commands.queryState(cmd)`. The result drives:

- `.penman-btn-active` class (visual highlight) when truthy.
- `aria-pressed="true"` for toggle commands (bold, italic, alignment).
- Button label updates for dropdowns whose `queryState` returns a string (font-size, block-type).

DOM is only mutated when state actually changes — avoids reflows during typing.

## 6.3. Buttons

`UIManager._createButton(cmd)` builds either a regular button or a dropdown depending on the registry. Each button gets:

- `aria-label` for screen readers.
- `data-tooltip="<i18n label>"` and optionally `data-tooltip-shortcut="Ctrl+B"` so the themed Tooltip service picks it up.
- The icon via `IconProvider.getIcon(cmd)` (falls back to the label text if no SVG is registered).
- `aria-pressed="false"` on toggle commands (bold, italic, etc.) for accessibility.

Plugin-registered buttons can pass:

```js
editor.ui.registry.addButton('foo', {
  text: 'Foo',
  ariaLabel: 'Insert Foo',         // optional override
  shortcut: 'Ctrl+Shift+F',        // optional, shown in tooltip
  ariaToggle: true,                // mark as toggle for aria-pressed
  icon: '<svg>...</svg>',          // optional explicit icon
  onAction: () => {}
});
```

## 6.4. Modal

`src/ui/Modal.js`. The low-level primitive. Used directly only when the UI is too custom for `FormModal` (e.g. the source-code modal with embedded CodeMirror, the content-audit modal).

```js
const modal = editor.ui.createModal({
  title: 'Custom dialog',
  width: '600px',
  hideFooter: false,
  body: '<div>...</div>',       // raw HTML string
  buttons: [                     // optional custom footer buttons
    { text: 'Save', classNames: 'penman-btn-primary', onClick: (e, m) => m.close() }
  ],
  onSubmit: (data) => {},         // ignored if `buttons` is provided
  onCancel: () => {}
});
```

Built-in behaviors: ESC closes, overlay click closes, focus trap on Tab, focus restoration on close, `aria-modal="true"` + `role="dialog"`.

## 6.5. FormModal

`src/ui/FormModal.js`. The preferred API for any modal whose body is a form. Eleven field types, automatic data collection, per-field validation:

```js
editor.ui.createFormModal({
  title: 'Insert Link',
  width: '600px',
  submitText: 'Insert',
  cancelText: 'Cancel',
  fields: [
    { type: 'url',  name: 'url',  label: 'URL',  required: true, dir: 'ltr' },
    { type: 'text', name: 'text', label: 'Display text' },
    {
      type: 'row',
      fields: [
        {
          type: 'select', name: 'target', label: 'Target',
          options: [
            { value: '',       label: 'None' },
            { value: '_blank', label: 'New window' }
          ]
        },
        { type: 'text', name: 'rel', label: 'Rel', dir: 'ltr' }
      ]
    },
    { type: 'checkbox', name: 'nofollow', label: 'Add nofollow' },
    { type: 'html', html: '<p class="hint">Penman validates URLs before insertion.</p>' }
  ],
  onSubmit: (data) => { /* { url, text, target, rel, nofollow } */ }
});
```

### Field types

| Type | Description |
|---|---|
| `text` / `url` / `email` / `number` / `search` / `tel` / `password` / `color` / `date` | Standard inputs. |
| `textarea` | Multi-line, `rows` configurable. |
| `select` | Native `<select>` with `options: [{value, label}]`. |
| `checkbox` | Boolean; iOS-style toggle styling via `--pm-toggle-*`. |
| `radio` | Radio group with `options`. |
| `hidden` | Carries a value through to `onSubmit` without rendering. |
| `row` | Horizontal layout for child fields. |
| `section` | `<fieldset>` with optional title. |
| `html` | Raw HTML escape hatch. |
| `custom` | Function `render: (modal) => HTMLElement` plus optional `getValue(el)`. |

### Validation

Per-field `validate: (value, allData) => 'error string' | undefined`. Errors are shown inline beneath the field; submit is blocked until all clear.

### Reading & writing field values

```js
formModal.collect();        // { name: value, ... } from every named field
formModal.getField('url');  // DOM element for the field
formModal.modalElement;     // the underlying Modal's container
formModal.close();
```

## 6.6. Dropdown

`src/ui/Dropdown.js`. The base primitive — a trigger button + a panel.

```js
const dropdown = editor.ui.createDropdown({
  title: 'My dropdown',
  icon: '<svg>...</svg>',
  content: '<div>raw HTML</div>',   // or an HTMLElement
  onOpen: (dd) => {},
  onClose: (dd) => {}
});
```

Built-in behaviors: ARIA (`aria-haspopup="menu"`, `aria-expanded`), keyboard (ArrowDown opens + focuses first item, Escape closes + returns focus to trigger), outside-click closes, RTL-aware positioning.

## 6.7. DropdownMenu (declarative items)

`src/ui/DropdownMenu.js`. Layered on top of `Dropdown` for plugins that just want a list of menu items.

```js
import { buildDropdownMenu } from '../../ui/DropdownMenu.js';

editor.ui.registry.addDropdown('mydropdown', {
  text: editor.i18n.t('plugins.myPlugin.dropdownLabel'),
  render: () => buildDropdownMenu(editor, {
    searchable: true,
    searchPlaceholder: 'Search…',
    items: [
      { type: 'section', title: 'Headings', items: [
        { type: 'item', label: 'H1', icon: '<svg/>', active: true, onAction: () => {} },
        { type: 'item', label: 'H2', onAction: () => {} }
      ]},
      { type: 'separator' },
      { type: 'item', label: 'Paragraph', onAction: () => {} },
      { type: 'custom', render: () => myCustomEl }
    ]
  })
});
```

Item types: `item`, `separator`, `header`, `section`, `custom`. Items get `role="menuitem"`, `aria-checked` for active state, `aria-disabled` for disabled.

`searchable: true` filters items by label substring (case-insensitive). Sections and headers are hidden when all their items filter out.

Items can also carry `style` (object) for inline CSS on the row (used by `FontSizePlugin` to render each size at its own size) and `renderLabel: (menu) => HTMLElement` for fully custom label content (used by `BlockTypePlugin` to render each option in its actual block tag).

## 6.8. Tooltip

`src/ui/Tooltip.js`. One service, one bubble, shared by every `data-tooltip` element on the page. `UIManager` installs it on first instantiation.

- Hover delay: 250 ms.
- Hides on click, scroll, blur, Escape.
- Themed via CSS variables — inverts colors in dark mode for contrast.
- Optional `data-tooltip-shortcut` adds a monospace keyboard pill.
- Optional `data-tooltip-placement="top|bottom"` overrides automatic placement.
- Direction-aware: reads `dir` from the nearest ancestor.

Buttons use the standard `title` attribute only as a fallback; UIManager strips it after wiring the themed tooltip so the browser's native bubble never competes.

## 6.9. ColorPicker

`src/ui/ColorPicker.js`. Standalone widget — used by `ColorPlugin` and `TablePlugin` (cell background color).

```js
import { ColorPicker } from '../../ui/ColorPicker.js';

const picker = new ColorPicker({
  defaultColor: '#000000',
  onChange: (hex, final) => {
    // final === true on swatch click; false on every hex-input keystroke
  }
});
container.appendChild(picker.getElement());
```

UI: a `#hex` input that accepts `#RGB`, `#RRGGBB`, or the literal string `transparent`, plus a 70-swatch palette. Transparent swatch renders as a checker pattern with a red diagonal strike. All styling lives in `penman-ui.css` and adapts to dark mode via CSS variables.

## 6.10. FloatingUI

`src/ui/FloatingUI.js`. A positioned bubble that anchors to a DOM node (used by `ImagePlugin`, `SuggestedPostsPlugin`, and `TablePlugin` for context menus).

```js
import { FloatingUI } from '../../ui/FloatingUI.js';

const floating = new FloatingUI(editor, { offset: 10, placement: 'top' });
floating.mount(htmlString);
floating.setAnchor(targetNode);
floating.show();
// later:
floating.hide();
floating.destroy();
```

Re-positions on scroll, resize, Escape closes. The `.penman-floating-toolbar` CSS class (in `penman-ui.css`) provides the standard look: rounded corners, themed background/border, arrow tail.

## 6.11. Theming

Two scopes of CSS variables:

| Scope | Used by | Examples |
|---|---|---|
| `--pm-*` | Chrome (toolbar, modals, dropdowns, tooltips, color picker) | `--pm-bg`, `--pm-text`, `--pm-accent`, `--pm-border`, `--pm-radius-sm` |
| `--pmc-*` | Editable content (`penman-content.css`) | `--pmc-text`, `--pmc-link`, `--pmc-bg-soft`, `--pmc-green-accent` |

Dark mode is one source of truth: the same variables get re-bound in `[data-theme="dark"]` blocks and a `@media (prefers-color-scheme: dark)` block that respects manual overrides. New components only need to reference the variables; they get dark mode for free.

To customize an entire theme, override the variables on `.penman-wrapper` from your host stylesheet.
