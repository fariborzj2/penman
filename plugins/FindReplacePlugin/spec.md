# FindReplacePlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Opens a Modal UI to collect Search and Replace parameters.
2. Initializes a `TextMapper` instance using a `TreeWalker` to create a 1D mapping of the DOM text offset.
3. Utilizes `findIndexForOffset` for O(log N) matches.
4. Searches handle parameters for Match Case, Whole Word, and Ignore Diacritics (RTL).
5. Replacements wrap native `Selection` ranges to execute `range.deleteContents()` and `range.insertNode()`.
6. Replace All strictly reverses iteration (from end to start) to prevent offset invalidation of preceding nodes.

## State Changes
- Highlights matched text synchronously via native selection APIs.
- Updates internal index state (`currentIndex`) on Next/Prev clicks.
- `editor.history` snapshot is pushed before replacements.

## Side Effects
- Emits `change` event on editor after any replacement.
- Re-syncs textarea (`_syncToTextarea`) after any replacement.
- Native selections are visually overridden to display the active search match.

## Edge Cases
- **Replace All spanning inline boundaries**: Properly replaces text across fragmented inline nodes via `TextMapper`.
- **Search target spans HTML nodes**: Handles splitting nodes when a match text boundary lies strictly between `<p>` or `<span>` tags.

## Error Conditions
- If the DOM split fails during native mutation, fallback behavior logs a `console.warn` ("Find and Replace native DOM split failed") and returns false.
