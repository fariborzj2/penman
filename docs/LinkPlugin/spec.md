# LinkPlugin Specification

## Options
None currently exposed as options at initialization.

## Internal Execution Rules
1. Retrieves native selection text before UI modal interaction.
2. Invokes `editor.selection.save()` to maintain structural markers while the modal is open.
3. Generates the modal dynamically with `url`, `text`, `target`, and `rel` inputs.
4. Triggers `editor.selection.restore()` prior to submission to safely inject DOM elements.
5. Executes insertion using `editor.insertContent()` manually assembling the anchor tag.

## State Changes
- Interacts with internal selection markers (saves/clears).
- Injects new anchor tags natively into the DOM stream.

## Side Effects
- Mutates user's exact native cursor location.
- Binds temporary Modal UI in the DOM structure.

## Edge Cases
- **Missing Link Text Input**: Falls back to displaying the `safeUrl` variable if text is not provided.
- **Cancel action**: Explicitly executes `editor.selection.restore()` to silently cleanup markers without applying changes.

## Error Conditions
- Fails securely by executing `escapeHtmlAttr` recursively on inputs to avoid script injections.
## Unlink Internal Execution Rules
1. Registers `REMOVE_LINK` command.
2. Performs lookup validating state querying `queryState()` traversing upwards toward `editableArea`.
3. Dispatches default `document.execCommand('unlink')`.
4. Tests if `range.collapsed` is explicitly true; acts as fallback iterating native parent lookups manually identifying anchor elements.
5. Employs DOM mutation utilizing unwrapping methodology (`insertBefore` and `removeChild`) for collapsed cursors native commands fail to process natively.

## Unlink State Changes
- Physically eliminates `<a>` tags.

## Unlink Side Effects
- Promotes children inline formatting components to parent nodes natively.

## Unlink Edge Cases
- **Collapsed perfectly inside link**: Solves traditional `execCommand` faults using hardcoded DOM traversal logic cleanly unwrapping nodes.

## Unlink Error Conditions
- Early exits automatically bypassing operations if `sel.rangeCount === 0`.
