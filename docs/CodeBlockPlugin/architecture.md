# CodeBlockPlugin Architecture

## Rendering Strategy & Pipeline

The CodeBlockPlugin strictly enforces plain text as the single source of truth. The DOM (`<pre><code>`) is purely a rendering representation of this text. To achieve high performance (< 8ms/16ms per keystroke), the plugin uses an **Incremental DOM Patching** approach rather than full re-renders (like `innerHTML` replacements).

### The Pipeline

1. **Extraction**: On every relevant input/mutation, the raw plain text is extracted from the code block via `textContent`.
2. **Tokenization**: The raw text is passed through an extremely fast, lightweight Regex-based tokenizer that categorizes chunks of text into semantic tokens (e.g., `keyword`, `string`, `comment`, `number`, `text`).
3. **Patching (`patchDOM`)**: The tokenizer output (an array of tokens) is compared against the actual child nodes of the `<code>` element in a single pass.
   - If the existing node matches the token type (TextNode for plain text, `<span>` for styled tokens) and has the exact content, it is skipped.
   - If the content differs but the type matches, `nodeValue` or `textContent` is updated directly.
   - If the type differs, or if there are missing/extra nodes, new nodes are inserted or old nodes are removed.
   - This ensures minimum DOM thrashing, keeping updates consistently fast and preventing browser reflow/repaint bottlenecks.

## Syntax Highlighting (Regex Tokenizer)

- No external libraries (e.g., highlight.js, Prism) are used.
- Version 1 supports only JavaScript.
- A single master regular expression (or sequential token matcher) scans the input string to extract tokens like block comments, line comments, strings, numbers, keywords, and default text.
- The tokenizer guarantees that combining all token values reconstructs the exact original string with no lost whitespace or structural changes.

## Cursor System

The cursor is tracked solely by its absolute character offset within the plain text representation of the block.

- **`saveCursor(codeNode)`**: Calculates the current caret offset by counting the string length of all nodes preceding the caret within the block.
- **`restoreCursor(codeNode, offset)`**: Iterates through the text content of the DOM nodes inside the block, accumulating length until the target offset is reached, then places the native Selection at that specific node and character position.
- This approach makes the cursor completely agnostic to how the DOM is sliced into spans by the highlighting process. It remains perfectly stable during typing, pasting, and mid-token edits.

## Edge Case Handling

- **Paste**: Intercepted to insert only plain text at the current cursor offset. The entire block is then re-tokenized and incrementally patched. No rich HTML is ever pasted into the code block.
- **Undo/Redo**: When the underlying history system restores previous DOM states or text content, mutation observers or explicit history hooks catch the changes. The plain text is extracted, re-highlighted, and patched, ensuring visual consistency without breaking the undo stack.
- **Large Files**: The regex and incremental patcher scale efficiently. By avoiding `innerHTML` building and complex DOM parsing on large blocks, the time per keystroke remains well within the 16ms budget, even up to 1000 lines.
- **Mid-token Edits**: Typing inside a keyword or string breaks the token into multiple parts (e.g., plain text instead of keyword). The incremental patcher seamlessly replaces the single `<span>` with text nodes or vice versa, while the offset-based cursor tracking ensures the caret stays exactly where the user typed.

## Sanitization Rules

- The editor's sanitizer is configured to whitelist the specific `span` classes used by the custom tokenizer (e.g., `.penman-token-keyword`).
- Code blocks are marked as safe zones where global DOM transformations (like wrapping or span merging) are disabled, protecting the tokenizer's exact output and the user's raw code.
