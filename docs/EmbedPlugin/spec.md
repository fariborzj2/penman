# Embed Plugin Specification

## Overview
The EmbedPlugin handles user-provided generic embed codes.

## Output Schema
When content is inserted, it creates the following block structure:

```html
<figure class="penman-embed-block" contenteditable="false">
  <div class="penman-embed-wrapper" style="position: relative; width: 100%; overflow: hidden; padding-bottom: 56.25%;">
    <iframe src="..." style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;"></iframe>
    <div class="penman-embed-overlay" style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; z-index: 10; cursor: pointer;"></div>
  </div>
</figure>
```

## Behavior
- Deletion: Can be deleted by clicking on the block (selecting it) and pressing Backspace/Delete.
- Focus: Wraps block inserts natively with `<p><br></p>` logic after the embed for correct caret placement.