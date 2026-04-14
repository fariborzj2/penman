# FindReplacePlugin Examples

## Example 1: Standard Find and Replace
- **Input**: Editor contains `The quick brown fox`. User searches "brown", replaces with "red".
- **Output OR behavioral result**: Editor reads `The quick red fox`.
- **Explanation of internal behavior**: The `TextMapper` locates the text offset. `highlightResult` uses `window.getSelection` to highlight "brown". `doReplaceAt` wraps a range around "brown", calls `range.deleteContents()` and `range.insertNode(document.createTextNode("red"))`.

## Example 2: Replace All across Fragmented Spans
- **Input**: Editor contains `<span>He</span>llo world. <span>He</span>llo user.`. User searches "Hello" and Replace All with "Bye".
- **Output OR behavioral result**: Editor reads `Bye world. Bye user.`.
- **Explanation of internal behavior**: `TreeWalker` maps the continuous text "Hello" despite span boundaries. "Replace All" iterates backwards. The fallback path for complex replacements (`startContainer !== endContainer`) runs `deleteContents` across the span boundary and inserts "Bye".

## Example 3: Match Case Validation
- **Input**: Editor contains `APPLE and apple`. Search for "APPLE" with Match Case = TRUE. Replace with "ORANGE".
- **Output OR behavioral result**: Result is `ORANGE and apple`.
- **Explanation of internal behavior**: `performSearch` strictly enforces casing via string comparison, ignoring the lower-cased "apple" text node offset during index mapping.
