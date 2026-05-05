# Embed Plugin

The Embed Plugin allows inserting arbitrary HTML and iframe code blocks into the Penman editor.

## Features
- Toolbar button to trigger embed modal.
- Input textarea for pasting raw embed code (e.g. `<iframe>`, `<embed>`, etc).
- Validates that inserted code contains embeddable tags.
- Inserts content as a block level `<figure>` element with a transparent overlay to allow block selection.

## Registration
Ensure to add `embed` to your editor plugins initialization config.