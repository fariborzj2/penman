# ImagePlugin Specification

## Options

### `imageUploadFn`
- **Type**: `function(File): Promise<string>`
- **Default value**: UNKNOWN
- **Required/Optional**: Required (if uploading is used)
- **Validation rules**: Must be a function returning a Promise that resolves to a URL string.
- **Failure behavior**: Throws Error "Upload requires files and an uploadFn configuration" if missing during drop/paste/upload.

## Internal Execution Rules
1. Setup Alignment Observers via `setupAlignmentObserver()`.
2. Binds strict listeners to `editableArea` for `keydown`, `paste`, `drop`, `blur`.
3. Handles `paste` and `drop` events specifically filtering for images vs `figcaption` contexts.
4. Programmatic insertions construct DOM nodes (e.g. `createFigureNode`) via explicit node creation (NOT `innerHTML`).
5. Evaluates explicit `TrustLevel` enums for URLs before insertion.
6. Delegates history snapshots to `captureAtomicSnapshot`.

## State Changes
- Inserts `<figure>` and `<figcaption>` elements natively.
- Toggles specific classes based on alignment properties.

## Side Effects
- Prevents default drag and drop browser behaviors for image types.
- Modifies native paste clipboard events to intercept file data.
- Registers programmatic object namespace: `editor.image`.

## Edge Cases
- **Pasting text inside Caption**: Explicitly delegates to `handleCaptionPaste` and halts execution to avoid injecting images directly inside captions.
- **URL safety**: Prevents execution if validation constraints fail synchronously.

## Error Conditions
- Fails with Error explicitly if `uploadImageCommand` is invoked without files or `uploadFn`.
- Fallbacks gracefully if `trustLevel` validation rejects URL.
