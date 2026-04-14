# ImagePlugin Examples

## Example 1: Insert Trusted URL
- **Input**: `editor.image.insertFromURL('https://trusted.com/image.png', 'Logo')`.
- **Output OR behavioral result**: `<figure><img src="https://trusted.com/image.png" alt="Logo"></figure>` injected at selection.
- **Explanation of internal behavior**: The API maps to `TrustLevel.TRUSTED`. `validateURL` approves it synchronously. `createFigureNode` utilizes `document.createElement` to assemble the payload. `insertFigureAtResolvedPoint` commits it to DOM.

## Example 2: Drag and Drop Upload
- **Input**: User drags a local `picture.jpg` onto the editor.
- **Output OR behavioral result**: `imageUploadFn` executes, returns URL, placeholder converts to uploaded image node.
- **Explanation of internal behavior**: `dropImageHandler` intercepts `e.preventDefault()`. `executeUploadPipeline` manages states: PLACED (creates loading node) -> UPLOADING (awaits `imageUploadFn`) -> SETTLED (mutates `img.src` natively and pushes history snapshot).

## Example 3: Untrusted Injection Prevention
- **Input**: `editor.image.insertUntrustedURL('javascript:alert(1)', 'Hack')`.
- **Output OR behavioral result**: Image is NOT inserted.
- **Explanation of internal behavior**: Mapped as `TrustLevel.UNTRUSTED`. `validateURL` executes regex verifying HTTP/HTTPS. It fails the protocol check, immediately throwing an error internally and halting the execution cycle before `createFigureNode` is invoked.
