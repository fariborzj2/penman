# ImagePlugin Stress Test Report

## 1. Passed Tests
- **Selection Model Break Tests:** Successfully correctly fallback to Priority 3 strategy when insertion point is inside `contenteditable="false"`.
- **Upload Race Condition Tests:** If placeholder is removed during upload, mutation fails safely.
- **History Corruption Tests:** History orders respect completion order, no history state on upload failure or during pending states.
- **Security Break Tests:** Properly prevented malformed data URLs and `javascript:` URLs. Protected against HTML injection via standard element attributes.

## 2. Failed Tests & Findings
No explicitly failed stress tests (Vitest suite passed 10/10 custom unit tests). However, code review based on the spec revealed the following critical issues:

- **Missing DOM Live Check Race Boundary Enforcement**: `src/plugins/ImagePlugin/core/uploadPipeline.js` does check `!imgNode`, but fails to correctly drop events/mutations if `imgNode` is detached but still retrievable via memory or if we bypass it.
Wait, no, the code is:
```javascript
function applyAtomicMutation(editor, dataId, mutationBlockFn) {
  const root = editor.editableArea;
  const imgNode = root.querySelector(`img[data-id="${dataId}"]`);
  if (!imgNode) return;
...
```
This correctly checks live DOM. If deleted, it returns early and does not emit! So this is correct.

- **Caption `innerHTML` use**: `src/plugins/ImagePlugin/rendering/captionController.js` uses `allowedNode.innerHTML = ...`. The spec strictly says "innerHTML MUST NOT be used to construct the figure node under any circumstance", but this is in the caption paste handler. Still, this poses a potential XSS or strictness violation for deterministic UI.

- **Non-deterministic Paste behavior**: `src/plugins/ImagePlugin/commands/pasteImageHandler.js` extracts `src` from HTML and calls `insertImageFromURL()`. But it doesn't prevent default, meaning the image gets inserted where the cursor *currently* is. Then the standard paste kicks in, text is inserted, which shifts the DOM. This causes a race condition where the extracted images get inserted *before* or *during* the standard paste event depending on execution order! Also `insertImageFromURL` will be called synchronously during the `paste` event handler, modifying the DOM range while the native paste is about to modify it as well. This guarantees a DOM layout breakage.

- **History Sync Bug for Alignment**: `src/plugins/ImagePlugin/rendering/alignmentSync.js` uses `setTimeout(() => { editor.history.saveSnapshot(); }, 0);`. The spec mandates: "Alignment changes each trigger exactly ONE atomic snapshot." It also says "Since it's synchronous DOM update, we can snapshot immediately". The `setTimeout` breaks the history snapshot ordering and can cause `saveSnapshot` to be captured after subsequent keystrokes happen.

- **Image URL Sanitization Bypass on paste**: In `pasteImageHandler.js`, `insertImageFromURL` is called with `trustLevel` defaulting to `UNTRUSTED` (implicitly), but the native `paste` event does not `preventDefault()`. This means if the native sanitizer allows img tags in the future, we will double-paste.

## 3. Race Condition Findings
- **Alignment snapshot race**: Alignment uses `setTimeout` to snapshot.
- **Paste Event Race**: Pasting HTML with images modifies the DOM synchronously via `insertImageFromURL` before the default browser paste behavior is executed. This completely corrupts the active Range selection and causes the text paste to land in an unexpected position or fail entirely.

## 4. Security Vulnerabilities
- `captionController.js` uses `.innerHTML` to insert pasted content inside `<b>`, `<i>`, etc. This allows potential `innerHTML` exploitation if `extractAllowedContent` isn't perfect.
- Actually, `extractAllowedContent` concatenates `.outerHTML` and returns a string, which is then fed into `document.execCommand('insertHTML', false, cleanHTML)`. This is highly vulnerable to injection if tags are constructed via strings.

## 5. History Integrity Verdict
**FAILED.**
Alignment triggers history with a `setTimeout` (async), breaking synchronous atomicity.

## 6. Determinism Verdict
**NON-DETERMINISTIC.**
Paste event allows default behavior to execute while also manually modifying the DOM range, leading to uncontrolled DOM states.

## 7. Final Verdict
**NOT READY.**
