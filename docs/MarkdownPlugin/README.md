# MarkdownPlugin

Inline Markdown auto-conversion. Two layers: (1) live block-match on keyup (typing `# ` becomes H1), (2) paste-time conversion of full Markdown documents.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['markdown']
});
```

No toolbar button — markdown shortcuts are silent UX that activate on keyboard input.

## What it registers

| Surface | Notes |
|---|---|
| Listener: `keyup` | On space / Enter, scans the line before the caret for a markdown trigger. |
| Listener: `beforePaste` | If pasted content is plain text and looks like markdown, converts to HTML before insertion. |

## Inline shortcuts (typed)

| Type… | Becomes |
|---|---|
| `# ` (space at start of line) | H1 |
| `## ` | H2 |
| `### ` | H3 (also `####`, `#####`, `######`) |
| `- ` or `* ` | Bullet list |
| `1. ` | Numbered list |
| `> ` | Blockquote |
| `--- ` (then enter) | Horizontal rule |

## Paste shortcuts (multi-line)

When pasting plain text, the parser handles full markdown documents:
- `[text](url)` → `<a>` (URL validated via `safeUrl`)
- `![alt](url)` → `<img>` (URL validated)
- `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` → inline elements
- Fenced code blocks with `\`\`\`` → `<pre><code>`
- Tables with `|---|`

The output is run through the sanitizer after construction.

## Behaviour

- If the user is pasting a URL onto an existing text selection, the plugin yields to the editor's built-in "magic paste" link-wrap (so the selection becomes the link text).
- All inline-text interpolations go through `escapeHtml` from `utils/html.js` to prevent stored XSS from clever markdown payloads.
