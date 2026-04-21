import { describe, it, expect } from 'vitest';
import { PriorityResolver } from './PriorityResolver.js';

describe('PriorityResolver', () => {
  it('resolves string config into tools with implicit priority', () => {
    const config = ['bold', 'italic', '|', 'underline'];
    const resolved = PriorityResolver.resolve(config);

    expect(resolved.length).toBe(4);
    expect(resolved[0].name).toBe('bold');
    expect(resolved[0].priority).toBe(1000);
    expect(resolved[1].name).toBe('italic');
    expect(resolved[1].priority).toBe(999);
    expect(resolved[2].isSeparator).toBe(true);
    expect(resolved[3].name).toBe('underline');
    expect(resolved[3].priority).toBe(997);
  });

  it('resolves object config with explicit priorities', () => {
    const config = [
      { name: 'bold', priority: 100 },
      { name: 'italic' }, // fallback priority
      { name: 'link', priority: 10 }
    ];
    const resolved = PriorityResolver.resolve(config);

    expect(resolved[0].priority).toBe(100);
    expect(resolved[1].priority).toBe(999); // 1000 - 1
    expect(resolved[2].priority).toBe(10);
  });

  it('sorts tools for overflow based on priority (lowest first)', () => {
    const resolved = [
      { name: 'a', priority: 100, originalIndex: 0 },
      { name: 'b', priority: 50, originalIndex: 1 },
      { name: 'c', priority: 50, originalIndex: 2 },
      { name: 'd', priority: 200, originalIndex: 3 }
    ];

    const sorted = PriorityResolver.sortByOverflowPriority(resolved);

    // b and c have same priority (50), so they sort by originalIndex descending (rightmost overflows first).
    // so c overflows before b.
    expect(sorted[0].name).toBe('c');
    expect(sorted[1].name).toBe('b');
    expect(sorted[2].name).toBe('a');
    expect(sorted[3].name).toBe('d');
  });
});
