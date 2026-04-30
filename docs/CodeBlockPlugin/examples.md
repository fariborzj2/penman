# CodeBlockPlugin Examples

## Enabling the Plugin

To include the CodeBlockPlugin in your Penman editor initialization:

```javascript
import { Editor } from 'penman';
import { CodeBlockPlugin } from 'penman/plugins/CodeBlockPlugin';

const editor = new Editor({
    element: document.getElementById('editor-container'),
    plugins: [
        CodeBlockPlugin
    ]
});
```

## Basic JavaScript Syntax Highlighting

Once enabled, using the `INSERT_CODEBLOCK` command or clicking the CodeBlock icon will insert an interactive, syntax-highlighted block:

```javascript
function helloWorld() {
    // This is a comment
    const greeting = "Hello, Penman!";
    let count = 42;
    console.log(greeting, count);
}
```

The plugin automatically processes this plain text to incrementally update spans representing `keyword`, `string`, `comment`, and `number` directly in the DOM, without lag.
