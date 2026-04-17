# LinkPlugin Specification

## Options
UNKNOWN

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
