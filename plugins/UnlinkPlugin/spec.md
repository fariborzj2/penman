# UnlinkPlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Registers `REMOVE_LINK` command.
2. Performs lookup validating state querying `queryState()` traversing upwards toward `editableArea`.
3. Dispatches default `document.execCommand('unlink')`.
4. Tests if `range.collapsed` is explicitly true; acts as fallback iterating native parent lookups manually identifying anchor elements.
5. Employs DOM mutation utilizing unwrapping methodology (`insertBefore` and `removeChild`) for collapsed cursors native commands fail to process natively.

## State Changes
- Physically eliminates `<a>` tags.

## Side Effects
- Promotes children inline formatting components to parent nodes natively.

## Edge Cases
- **Collapsed perfectly inside link**: Solves traditional `execCommand` faults using hardcoded DOM traversal logic cleanly unwrapping nodes.

## Error Conditions
- Early exits automatically bypassing operations if `sel.rangeCount === 0`.
