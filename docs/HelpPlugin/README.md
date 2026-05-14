# HelpPlugin

Opens a categorized help dialog that teaches the writer keyboard shortcuts, Markdown auto-conversions, usage tips, and editor metadata.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['help'],
  toolbar: 'help'
});
```

Also opens with **F1** while the editable area is focused.

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `OPEN_HELP` | Opens the dialog. |
| Button | `help` | Toolbar icon (circled question mark). |
| Keyboard | `F1` | Listens inside the editable area only (does not hijack browser-global F1). |
| i18n namespace | `plugins.help` | Full Persian + English translations of every section. |
| Icons | `help` | |

## Dialog sections

1. **Keyboard Shortcuts** — Ctrl/⌘+B/I/U for formatting, Ctrl/⌘+Z/Y for undo/redo, Ctrl/⌘+F for find, Ctrl+Shift+S for source code, Ctrl/⌘+Enter for breakout, Tab/Shift+Tab for indent. Shows `⌘` on macOS, `Ctrl` elsewhere via `utils/platform.modKey()`.
2. **Markdown Shortcuts** — `# `, `## `, `### ` for headings, `- ` for bullet, `1. ` for numbered, `> ` for quote, `` `code` `` for inline code, `**...**` / `*...*` for bold/italic, `---` for horizontal rule.
3. **Tips** — quick how-tos for images, links, tables, direction, paste, autosave, source view.
4. **About** — editor name, version, license.

## Theming

Kbd glyphs are styled with `penman-help-kbd` class — adapts to dark mode via CSS variables. The dialog uses `FormModal` with a single `html` field, so footer (Close button) and overlay come from the standard modal stack.

## Boundaries

- Does NOT execute shortcuts itself — only displays them. Actual keyboard handlers live in the relevant plugins (`FormatPlugin`, `FindReplacePlugin`, etc.).
- Static content. To add a custom tip or shortcut, fork the plugin or fork the `lang/{fa,en}.js` strings.
