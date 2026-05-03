# Spec

## Events
- Listen to `keyup` on the editor.
- Check `e.key`. If it is `Space` or `Enter`, evaluate the current text block.
- Supported patterns:
  - `# ` -> Heading 1
  - `## ` -> Heading 2
  - `### ` -> Heading 3
  - `#### ` -> Heading 4
  - `##### ` -> Heading 5
  - `###### ` -> Heading 6
  - `* ` or `- ` -> Unordered List
  - `1. ` -> Ordered List
  - `> ` -> Blockquote
  - `---` -> Horizontal Rule
  - `**text**` -> Bold (inline)
  - `*text*` or `_text_` -> Italic (inline)
  - `~~text~~` -> Strikethrough (inline)
  - `\`text\`` -> Inline Code (if SourceCodePlugin is used/supported or inline code supported). Let's skip inline code if not explicitly supported.
