# CodeBlock Plugin Spec

- **Name**: `codeblock`
- **Goal**: Provides a simple way to format and present source code blocks (`<pre><code>`) in the editor content, avoiding complex structural parsing.
- **UI Element**: Action button in the toolbar.
- **Behavior (Command)**: `INSERT_CODEBLOCK`
  - Creates a block `<pre dir="ltr" style="text-align: left; white-space: pre-wrap; font-family: monospace; background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto;"><code dir="ltr" style="font-family: monospace;">...</code></pre>`.
  - Content insertion logic:
    - If selection is text, wraps text.
    - If empty line, inserts an empty code block ready to type into.
  - Ensures accurate preservation of newlines and indentations on paste within the code block.
  - Must intercept Paste events when the cursor is inside `<pre><code>` to prevent the editor from injecting `P` tags or messing up newlines.
- **Direction & Styling**: Always LTR and left-aligned, ensuring no style conflicts with Persian/RTL contexts.
- Updates `Sanitizer.js` to whitelist `dir` and `style` on `pre` and `code` tags.
