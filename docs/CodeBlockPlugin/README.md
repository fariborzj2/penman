# CodeBlock Plugin

Provides a simple way to format and present source code blocks (`<pre><code>`) in the editor content, avoiding complex structural parsing.

## Features
- Toggle code block formatting on paragraphs.
- Correctly formats `<pre>` and `<code>` elements with proper LTR styling, background, and fonts.
- Reverts a code block back into a regular paragraph when toggled off.
- Intercepts paste events inside the code block to insert plain text (preserving line breaks/indentation) and avoid creating rich text `p` wrappers.
