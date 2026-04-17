# ImagePlugin

## Exact purpose of the plugin
Manages the lifecycle of images within the editor, including insertion from URL, file uploading via drag/drop/paste, caption management, and alignment.

## System role
Registers core DOM observers and event listeners (keydown, paste, drop, blur) for figures and captions. Exposes a programmatic `editor.image` API for gallery integration, untrusted/trusted URL insertion, and asynchronous file uploads. Utilizes a strict figure/figcaption rendering architecture.

## Clear boundary of what it DOES NOT do
- Does NOT provide its own UI Modals for inserting images (relies on external/toolbar UI to call its APIs).
- Does NOT handle image resizing via drag handles (unless implemented in external modules).
- Does NOT use `innerHTML` for DOM insertions, strictly constructs DOM nodes.

## Dependencies
- `GallerySystem`
- `TrustLevel` / Security module
- `editor.options.imageUploadFn`
