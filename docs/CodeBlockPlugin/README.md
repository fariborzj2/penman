# CodeBlock Plugin

Provides high-performance, syntax-highlighted code blocks (`<pre><code>`) in the editor content, similar to professional IDEs.

## Features
- **Real Syntax Highlighting**: Powered by `highlight.js` with automatic language detection.
- **Smart Editing**:
  - **Auto-indent**: Pressing Enter preserves the leading indentation of the previous line.
  - **Tab Support**: Inserts 2 spaces for consistent code indentation.
  - **Cursor Preservation**: Real-time highlighting does not disrupt the cursor position.
- **LTR Enforcement**: Code blocks are always LTR and left-aligned, ensuring readability in RTL contexts.
- **Toggle Mechanism**: Easily convert paragraphs to code blocks and back.
- **Clean Paste**: Automatically sanitizes and highlights pasted code.
