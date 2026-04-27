# 23 - Smart Paste Specification

## Exact purpose
The "Smart Paste" feature ensures that when a user pastes block-level content (like a paragraph) into an existing block in the editor, the content is merged naturally rather than creating redundant nested or split blocks.

## Architectural Design

### Problem Statement
Native browser behavior for `insertHTML` often splits the current block to accommodate incoming block-level elements. If a user copies text that was wrapped in `<p>` and pastes it at the end of another `<p>`, the result is often two separate paragraphs, which disrupts the flow of writing.

### Proposed Solution: Smart Merge
The editor intercepts the `paste` event and performs a pre-insertion transformation on the sanitized HTML fragment.

#### Identification Logic
The editor identifies the "merge context" by checking if:
1. The selection is collapsed.
2. The selection is within a "mergeable" block element (`p`, `h1`-`h6`, `blockquote`, `li`).

#### Transformation Rules
If a merge context is identified, the editor parses the sanitized HTML into a `DocumentFragment` and applies these rules:
1. **Leading Block**: If the first child of the fragment is a block of a compatible type, its children are unwrapped and placed directly at the top of the fragment.
2. **Trailing Block**: If the last child of the fragment is a block of a compatible type, its children are unwrapped.

#### Integration with Browser API
The transformed HTML string is then passed to `document.execCommand('insertHTML')`. This allows the browser to perform the actual insertion and merge the unwrapped content into the current block context naturally, while still preserving the undo/redo history and native selection management.

## Implementation Details
- **Module**: `src/core/Editor.js`
- **Method**: `_handlePaste` (refactored from anonymous listener)
- **Dependency**: `DOMParser` for fragment analysis.
- **Whitelist**: Only simple block wrappers are unwrapped; complex widgets (tables, figures) remain intact.
