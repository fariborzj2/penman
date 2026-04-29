# Block Breakout Logic Specification

## Goal
To allow users to quickly exit any type of block-level container and continue typing in a new paragraph at a higher level, avoiding broken structures or unpredictable behavior. This is designed as an **Aggressive Breakout** to ensure a smooth user experience.

## Scope
This behavior applies to all block-level editable containers, including:
- Standard text blocks (paragraph, headings, blockquotes)
- Custom blocks (embeds, figures, callouts, tables, etc.)
- Code blocks (`pre`, `code`)

## Keyboard Shortcuts
- **Cmd + Enter** (macOS)
- **Ctrl + Enter** (Windows)

## Behavior Details
1. **Exit and Create**: The user exits the current logical block structure completely, and a new paragraph (`<p>`) is created at the root level (or after the top-most block container).
2. **Cursor Placement**: The cursor is moved to the newly created paragraph, which is positioned immediately after the original logical block.
3. **Aggressive Breakout**: In nested structures (e.g., a paragraph inside a blockquote), the logic targets the top-most block-level container within the editable area. It exits the entire structure in one action, rather than step-by-step.
4. **Code Blocks**: Code blocks follow the same rules without exception. Breaking out of a code block moves the cursor outside the `pre/code` structure and creates a new paragraph.
5. **Limitations**:
   - If the cursor is already at the root level and not inside any specialized block, it simply inserts a new paragraph after the current one (default behavior).
   - If the region is restricted and cannot be exited, the default `Enter` behavior is maintained.

## Implementation Details
- The logic is implemented in `src/core/Editor.js` within the `keydown` event listener.
- It detects `event.ctrlKey` (Windows) or `event.metaKey` (macOS) combined with `Enter`.
- It identifies the top-most block-level element that is a direct child of `editor.editableArea` by walking up from the selection.
- A new `<p><br></p>` is inserted after this identified top-level block.
- History is captured using `editor.history.pushImmediate()`.
