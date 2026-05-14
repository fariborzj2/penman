# CodeBlockPlugin

Inserts and renders `<pre><code>` blocks for code snippets, with syntax highlighting via a built-in regex tokenizer.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['codeblock'],
  toolbar: 'codeblock'
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| Command | `INSERT_CODEBLOCK` | Inserts an empty `<pre><code>` and places the caret inside. |
| Button | `codeblock` | Toolbar icon. |
| i18n namespace | `plugins.codeBlock` | |
| Icons | `codeblock` | |

## Behaviour

- **Enter** inside a code block inserts a newline (does NOT exit the block).
- **Enter** twice on an empty line (or **Ctrl/⌘+Enter**) breaks out into a fresh paragraph below.
- **Backspace** at the start of an empty block deletes the block entirely.
- **Tab** inserts a 2-space indent at the caret.
- Pasted code keeps text as-is (no Markdown auto-convert) and is re-tokenized.

## Styling

Ships a "VS Code Dark+" inspired palette in `penman-content.css` that works on both light and dark editor surfaces (the block always has a dark background by design).
