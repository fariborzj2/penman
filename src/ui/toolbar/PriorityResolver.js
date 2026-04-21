export class PriorityResolver {
  /**
   * Assigns default priorities and structures tool definitions.
   * @param {Array} rowConfig - Array of tool configurations (strings or objects)
   * @returns {Array} Array of normalized tool objects with `{ name, priority, originalIndex, isSeparator }`
   */
  static resolve(rowConfig) {
    return rowConfig.map((item, index) => {
      // Base priority is calculated so that earlier items have higher default priority
      // e.g., index 0 has priority 1000, index 1 has 999, etc.
      // This means right-most items will overflow first if no explicit priority is given.
      const defaultPriority = 1000 - index;

      if (typeof item === 'string') {
        if (item === '|') {
          return {
            name: 'separator-' + index,
            isSeparator: true,
            priority: defaultPriority,
            originalIndex: index
          };
        }
        return {
          name: item,
          priority: defaultPriority,
          originalIndex: index
        };
      }

      if (typeof item === 'object' && item !== null) {
        return {
          name: item.name,
          priority: item.priority !== undefined ? item.priority : defaultPriority,
          originalIndex: index
        };
      }

      return null;
    }).filter(Boolean);
  }

  /**
   * Sorts items to determine overflow order.
   * Items with lower priority overflow FIRST (so they appear at the start of the sorted array).
   * @param {Array} items - Resolved tool items
   * @returns {Array} Sorted items
   */
  static sortByOverflowPriority(items) {
    return [...items].sort((a, b) => {
      // Lower priority number means it goes to overflow first.
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // If priorities match, sort by original index (rightmost overflows first)
      return b.originalIndex - a.originalIndex;
    });
  }
}
