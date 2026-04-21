import { PriorityResolver } from './PriorityResolver.js';

export class OverflowEngine {
  constructor(rowManager) {
    this.rowManager = rowManager; // Reference to the RowLayoutManager
    this.itemWidths = new Map();
    this.sortedForOverflow = [];
  }

  /**
   * Initializes the engine with the row's items.
   * @param {Array} items - Resolved tool items
   */
  init(items) {
    this.sortedForOverflow = PriorityResolver.sortByOverflowPriority(items);
  }

  /**
   * Measures the widths of all visible items in the DOM.
   * Caches the results to avoid forced reflows during resize events.
   */
  measureWidths() {
    this.itemWidths.clear();
    const children = this.rowManager.rowElement.children;

    // Temporarily ensure everything is visible to measure
    for (let i = 0; i < children.length; i++) {
       const child = children[i];
       const name = child.dataset.cmd;
       if (name && name !== 'overflow') {
          // We must measure it while it's in the main row
          const rect = child.getBoundingClientRect();
          // Add margin/gap estimation if needed. The CSS 'gap' is handled by flex container,
          // but if we sum widths we need to account for gaps.
          // We will measure outer width approximately, or just rely on flex gap math later.
          // For simplicity, we store the raw width.
          const styles = window.getComputedStyle(child);
          const marginLeft = parseFloat(styles.marginLeft) || 0;
          const marginRight = parseFloat(styles.marginRight) || 0;
          this.itemWidths.set(name, rect.width + marginLeft + marginRight);
       }
    }
  }

  /**
   * Calculates which items should be overflown based on available width.
   * @param {number} availableWidth - The total width available for the row
   * @returns {Object} { visible: [...names], overflow: [...names] }
   */
  calculate(availableWidth) {
    // If we haven't measured yet, we can't calculate properly
    if (this.itemWidths.size === 0) {
      return {
        visible: [...this.sortedForOverflow].sort((a, b) => a.originalIndex - b.originalIndex).map(i => i.name),
        overflow: []
      };
    }

    // Get gap size from the row container styles
    const rowStyles = window.getComputedStyle(this.rowManager.rowElement);
    const gap = parseFloat(rowStyles.gap) || 4; // Default to 4px if parsing fails
    const paddingLeft = parseFloat(rowStyles.paddingLeft) || 0;
    const paddingRight = parseFloat(rowStyles.paddingRight) || 0;

    const usableWidth = availableWidth - paddingLeft - paddingRight;

    let totalWidth = 0;
    let visibleCount = 0;

    // Calculate total width if everything is visible
    this.sortedForOverflow.forEach(item => {
       const w = this.itemWidths.get(item.name) || 0;
       totalWidth += w;
       visibleCount++;
    });

    // Add gaps
    totalWidth += Math.max(0, (visibleCount - 1) * gap);

    if (totalWidth <= usableWidth) {
      // Everything fits
      return {
        visible: [...this.sortedForOverflow].sort((a, b) => a.originalIndex - b.originalIndex).map(i => i.name),
        overflow: []
      };
    }

    // We need overflow
    const dropdownWidth = this.rowManager.dropdown.getButtonWidth() + gap;
    let currentWidth = totalWidth;
    let itemsToOverflow = new Set();

    // Process items in order of overflow priority (lowest priority first)
    for (let i = 0; i < this.sortedForOverflow.length; i++) {
        const item = this.sortedForOverflow[i];

        // Separators don't strictly overflow, they are hidden if they are at the edges or if items around them overflow.
        // We'll manage them later, but for width calc, we can tentatively remove them.
        const w = this.itemWidths.get(item.name) || 0;

        itemsToOverflow.add(item.name);
        currentWidth -= w;
        visibleCount--;

        // Recalculate gaps
        // currentWidth includes the old gaps. But we decrement visibleCount, so the gap math changes.
        // Let's accurately calculate the width of the remaining items.
        let remainingWidth = 0;
        let remainingCount = 0;
        this.sortedForOverflow.forEach(remItem => {
             if (!itemsToOverflow.has(remItem.name)) {
                  remainingWidth += this.itemWidths.get(remItem.name) || 0;
                  remainingCount++;
             }
        });

        let newTotalWidth = remainingWidth + Math.max(0, (remainingCount - 1) * gap);

        // Check if remaining items + dropdown button fit
        if (newTotalWidth + dropdownWidth <= usableWidth) {
            break;
        }
    }

    // Determine final visible array (maintaining original order)
    const visibleNames = [];
    const overflowNames = [];

    // Sort original array to maintain order
    const originalOrder = [...this.sortedForOverflow].sort((a, b) => a.originalIndex - b.originalIndex);

    originalOrder.forEach(item => {
        if (itemsToOverflow.has(item.name)) {
            // Separators don't go into the dropdown
            if (!item.isSeparator) {
               overflowNames.push(item.name);
            }
        } else {
            visibleNames.push(item.name);
        }
    });

    // Clean up trailing/leading/double separators in visible array
    const cleanedVisible = this._cleanSeparators(visibleNames, originalOrder);

    return {
        visible: cleanedVisible,
        overflow: overflowNames
    };
  }

  _cleanSeparators(visibleNames, originalOrder) {
     const result = [];
     let lastWasSeparator = true; // True initially to strip leading separators

     for (let i = 0; i < visibleNames.length; i++) {
         const name = visibleNames[i];
         const itemDef = originalOrder.find(item => item.name === name);

         if (itemDef.isSeparator) {
             if (!lastWasSeparator) {
                 result.push(name);
                 lastWasSeparator = true;
             }
         } else {
             result.push(name);
             lastWasSeparator = false;
         }
     }

     // Strip trailing separator
     if (result.length > 0) {
         const lastItemDef = originalOrder.find(item => item.name === result[result.length - 1]);
         if (lastItemDef && lastItemDef.isSeparator) {
             result.pop();
         }
     }

     return result;
  }
}
