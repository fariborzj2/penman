# SourceCodePlugin

View and edit the editor's raw HTML in a full-featured CodeMirror panel. Used for advanced edits, debugging output, or recovering after a paste glitch.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['sourcecode'],
  toolbar: 'sourcecode'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Button | `sourcecode` | Toolbar icon. |
| i18n namespace | `plugins.sourceCode` | |
| Icons | `sourcecode` | |
| Shortcut | `Ctrl+Shift+S` | Toggle the modal. |

## CodeMirror integration

The modal embeds a real CodeMirror 6 instance:

- `@codemirror/lang-html` for HTML syntax + bracket-matching.
- `@codemirror/search` for find/replace inside the source view.
- `@codemirror/theme-one-dark` is applied **only** when the editor is in dark mode (live-swapped via a `Compartment` when `themeChange` fires).

The chrome (`.cm-content`, `.cm-gutters`, `.cm-panels`) reads `var(--pm-*)` so it adapts to the editor theme automatically.

A custom search bar above the editor wraps CodeMirror's native search panel with themed inputs and prev/next buttons.

## On apply

- HTML is formatted via `formatHTML.js` (the plugin's own pretty-printer) for readability.
- Submitted content goes through the editor sanitizer before replacing the document.
- A history snapshot is pushed so the change is undoable as one atomic edit.

## Unsaved changes guard

Trying to close the modal with unsaved edits opens a confirmation modal: "Discard unsaved changes?" The user must explicitly discard.
