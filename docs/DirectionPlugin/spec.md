# DirectionPlugin Specification

## Options
The plugin accepts a `directionOptions` object in the editor initialization:

*   `auto` (boolean): Enable auto-detection. Default is `false`.
*   `default` (string): The default direction ('ltr' or 'rtl') for empty or ambiguous blocks. Default is `'ltr'`.
*   `toolbar` (boolean): Whether to register toolbar buttons. Default is `true`.
*   `detection` (object): Options for the detection algorithm.
    *   `strategy` (string): Algorithm to use (`'first-strong'` or `'ratio'`). Default is `'first-strong'`.
    *   `sampleSize` (number): Number of characters to sample when using the 'ratio' strategy. Default is `120`.
    *   `rtlThreshold` (number): The ratio threshold to trigger RTL when using the 'ratio' strategy. Default is `0.3`.
*   `debounce` (number): Delay in milliseconds for debouncing input events. Default is `150`.
*   `ignore` (array): Array of tag names to ignore during auto-detection. Default is `['PRE', 'CODE']`.
*   `lock` (object): Options for manual locking.
    *   `attribute` (string): Data attribute used to lock a block's direction. Default is `'data-dir-lock'`.
    *   `persistOnEmpty` (boolean): Whether to keep the lock when a block is emptied. Default is `false`.

## Internal Execution Rules
1. Monitors content changes (debounced) and iterates through block-level elements.
2. If auto-detection is enabled, extracts text from the block (ignoring nested blocks) and applies the detected direction based on the configured strategy.
3. If a user manually sets the direction, applies an HTML attribute (e.g., `data-dir-lock`) to the block to prevent auto-detection from overriding it.
4. Auto-detection is skipped for elements in the `ignore` list.
5. Emits `change` event and pushes to history synchronously when manual actions are taken.

## Commands
*   `SET_DIR_RTL`: Sets the block at the cursor to RTL and locks it.
*   `SET_DIR_LTR`: Sets the block at the cursor to LTR and locks it.
*   `RESET_DIR`: Removes the manual lock from the block at the cursor and re-runs auto-detection.

## Public API (`editor.direction`)
*   `set(dir)`: Programmatically set direction for the block containing the cursor (`'ltr'` or `'rtl'`).
*   `reset()`: Removes the manual lock for the block containing the cursor.
*   `refresh()`: Forces a full re-scan of the editable area.
*   `detect(text)`: Analyzes a plain-text string and returns `'ltr'` or `'rtl'`.

## Side Effects
- Modifies the `dir` attribute and a lock data attribute on block elements.
- Registers UI buttons (`dirrtl`, `dirltr`, `dirreset`) to the toolbar registry.
- Registers custom commands in the CommandManager.
