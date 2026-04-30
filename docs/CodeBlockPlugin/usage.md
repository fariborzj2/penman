# CodeBlockPlugin Usage

## Interacting via UI
1. **Insert**: Click the "Code Block" button in the Penman toolbar.
2. **Type**: Begin typing JavaScript. The text is highlighted automatically and instantaneously.
3. **Shortcuts**: Use `Enter` for auto-indentation and `Tab` for spaces.
4. **Exit/Toggle**: Clicking the Code Block button while inside an existing code block will convert the content back to standard paragraphs, stripping out code styling.

## Programmatic Execution
You can manually invoke the block via the editor instance:

```javascript
// Toggle the current selection into a codeblock, or back to paragraph
editor.execCommand('INSERT_CODEBLOCK');
```

## Supported Syntax (v1)
Currently, syntax highlighting is strictly limited to JavaScript. It recognizes:
- `keyword` (`let`, `const`, `function`, `return`, `class`, `if`, etc.)
- `string` (Double quotes, single quotes, template literals)
- `comment` (Line and block)
- `number` (Integers and floats)
