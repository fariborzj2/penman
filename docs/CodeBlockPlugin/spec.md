# CodeBlockPlugin Specification

## General
- **Plugin Name**: `codeblock`
- **Goal**: Provide an extremely fast, syntax-highlighted code block (`<pre><code>`) that scales to large inputs without UI blocking or cursor jumping.
- **Command**: `INSERT_CODEBLOCK`
  - Toggles the current block between paragraph and code block, preserving plain text content.

## Architecture
- **Source of Truth**: Plain text extracted via `textContent`.
- **Renderer**: An Incremental DOM Patcher that updates only changed nodes. It strictly forbids wholesale `innerHTML` reassignment.
- **Tokenizer**: A purely Regex-based lexer parsing JavaScript. It matches block comments, line comments, double/single-quoted strings, template literals, numbers, and keywords.
- **Dependencies**: **NONE**. Usage of `highlight.js`, `Prism`, or similar external lexers is strictly forbidden.

## Cursor Mechanics
- **Model**: Absolute character offset.
- **State Capture**: Upon input, the cursor's absolute index within the block's text content is calculated and stored.
- **Restoration**: After the DOM is patched by the rendering pipeline, the cursor is mapped back to the corresponding DOM node and relative offset.

## Keystroke & Event Hooks
- **Enter**: Prevents default browser paragraph splitting. Inserts `\n` and replicates the leading whitespace of the current line (Auto-indent).
- **Tab**: Prevents focus shift. Inserts exactly 2 spaces.
- **Paste**: Intercepted to extract plain text via `clipboardData.getData('text/plain')`. CRLF is normalized to LF. If the pasted code is a single line, it is automatically formatted with line breaks and indentation using syntax tokens before being inserted. The patcher immediately updates the block.

## Constraints & Sanitization
- Performance must remain under 8-16ms per keystroke.
- Token styles use specific class names (e.g., `penman-token-keyword`) which are explicitly whitelisted in the editor's core sanitizer.
- The sanitizer is explicitly forbidden from stripping elements or merging text nodes within `<pre><code>` blocks if doing so corrupts the tokenized structure.
