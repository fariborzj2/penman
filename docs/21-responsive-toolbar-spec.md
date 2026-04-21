# 21 - Advanced Responsive Toolbar System Specification

## 1. Overview
The Penman Advanced Responsive Toolbar System replaces the legacy string-based toolbar with a highly responsive, two-row architecture. It introduces an intelligent overflow mechanism that dynamically moves items into a dropdown `(...)` based on available width, prioritizing items based on a defined priority.

## 2. Configuration Format
The editor now accepts a structured toolbar configuration in addition to the legacy string.

```javascript
toolbar: {
  rows: [
    ['bold', 'italic', 'underline', 'link'], // Implicit priority by order
    [
      { name: 'h1', priority: 100 },
      { name: 'h2', priority: 90 },
      { name: 'quote', priority: 50 },
      { name: 'code', priority: 10 },
      { name: 'direction', priority: 10 }
    ]
  ]
}
```
* Legacy string configs (e.g., `'undo redo | bold'`) will be parsed into a single row or split by logic.
* **Two Rows**: The UI supports up to two distinct rows.
* **No Wrapping**: Rows have `flex-wrap: nowrap`. Overflown items are moved to a dropdown.

## 3. Architecture

The system is broken down into the following modules in `src/ui/toolbar/`:

*   **`ToolbarRenderer`**: Orchestrates the toolbar. Reads config, initializes rows.
*   **`RowLayoutManager`**: Manages a single row's DOM and delegates to `OverflowEngine`.
*   **`OverflowEngine`**: Calculates available width, measures items, and determines which items overflow.
*   **`PriorityResolver`**: Sorts items based on priority rules for the overflow logic.
*   **`ResizeHandler`**: Wraps `ResizeObserver` to detect container size changes efficiently, debouncing/batching updates.
*   **`DropdownController`**: Manages the `(...)` overflow dropdown UI for a specific row.

## 4. Priority System
*   Items explicitly configured with a `priority` use that value.
*   Lower priority items are moved to the dropdown first.
*   If no priority is defined, fallback to order-based priority (right-most items have lower priority and overflow first).

## 5. Intelligent Overflow Algorithm
1.  **Measure**:
    *   Get `availableWidth` of the row container.
    *   Measure width of the `DropdownController` button (the `...` button).
    *   Measure width of each toolbar item in the row (cached to avoid layout thrashing).
2.  **Calculate**:
    *   If total width of all items <= `availableWidth`, show all items. Hide dropdown.
    *   If total width > `availableWidth`:
        *   Show dropdown button.
        *   Iterate items based on *ascending* priority (lowest priority first).
        *   Move items to dropdown until the remaining visible items' total width + dropdown button width <= `availableWidth`.
3.  **Render**: Apply DOM changes in a batched operation to prevent layout thrashing. Preserve original DOM order for visible items.

## 6. Performance Strategy
*   **Measurement Caching**: Item widths are cached after initial render or when tools change.
*   **ResizeObserver**: Used on the toolbar container (not window) for precise resizing.
*   **Batch DOM Updates**: Reads (measurements) and writes (moving elements) are separated to avoid reflow storms.

## 7. Responsive & RTL Support
*   Dropdowns are anchored correctly to the row end.
*   In RTL mode, the layout flips, and the dropdown anchors to the left edge.
*   Hit targets on mobile are >= 40px for touch friendliness.
