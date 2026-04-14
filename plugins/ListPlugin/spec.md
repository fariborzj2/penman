# ListPlugin Specification

## Options
UNKNOWN

## Internal Execution Rules
1. Registers buttons for `bullist` and `numlist`.
2. Employs `document.execCommand('insertUnorderedList')` and `document.execCommand('insertOrderedList')` respectively.

## State Changes
- Mutates standard `<p>` elements into nested `<ul>`/`<ol>` structures natively.

## Side Effects
- Relies wholly on browser layout and default CSS engine list behavior.
- Resets inline font sizings and paddings based on user-agent styles dynamically.

## Edge Cases
- **Re-triggering on active list**: Browser natively toggles/converts list back to paragraph elements or swaps list type.

## Error Conditions
- Browser execCommand faults fail silently natively.
