/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverflowEngine } from './OverflowEngine.js';

describe('OverflowEngine', () => {
  let engine;
  let mockRowManager;

  beforeEach(() => {
    mockRowManager = {
      rowElement: { children: [] },
      dropdown: { getButtonWidth: () => 40 }
    };
    engine = new OverflowEngine(mockRowManager);

    // Provide mocked CSS
    window.getComputedStyle = vi.fn().mockImplementation(() => ({
      gap: '4px',
      paddingLeft: '0px',
      paddingRight: '0px',
      marginLeft: '0px',
      marginRight: '0px'
    }));
  });

  it('calculates no overflow if everything fits', () => {
    engine.init([
      { name: 'bold', priority: 100, originalIndex: 0 },
      { name: 'italic', priority: 100, originalIndex: 1 }
    ]);

    engine.itemWidths.set('bold', 30);
    engine.itemWidths.set('italic', 30);
    // Total width = 30 + 30 + 4(gap) = 64

    const result = engine.calculate(100);
    expect(result.visible).toEqual(['bold', 'italic']);
    expect(result.overflow).toEqual([]);
  });

  it('calculates overflow moving lowest priority first', () => {
    engine.init([
      { name: 'high', priority: 100, originalIndex: 0 },
      { name: 'low', priority: 10, originalIndex: 1 }
    ]);

    engine.itemWidths.set('high', 50);
    engine.itemWidths.set('low', 50);
    // Total width = 50 + 50 + 4 = 104

    const result = engine.calculate(90);
    // Total width 104 > 90. Need overflow.
    // Dropdown is 40. However, when we add the dropdown to the end, it ALSO needs a gap.
    // So dropdown width is actually 40 + 4 (gap) = 44.
    // So visible width needs to be <= 90 - 44 = 46.
    // But 'high' alone is 50. So 'high' AND 'low' must overflow!

    expect(result.visible).toEqual([]);
    // The engine sorts them to preserve original order, so high is before low
    expect(result.overflow).toEqual(['high', 'low']);
  });

  it('cleans up trailing and double separators in visible list', () => {
    engine.init([
      { name: 'btn1', priority: 100, originalIndex: 0 },
      { name: 'sep1', priority: 90, originalIndex: 1, isSeparator: true },
      { name: 'btn2', priority: 10, originalIndex: 2 }
    ]);

    engine.itemWidths.set('btn1', 50);
    engine.itemWidths.set('sep1', 0); // Separators usually have 0 width in setup due to mock
    engine.itemWidths.set('btn2', 50);
    // Total width = 50 + 0 + 50 + 8 (2 gaps) = 108

    // Need overflow since 108 > 80.
    // remove btn2 (lowest priority).
    // Remaining: btn1 (50) + sep1 (0) + 4 (gap) = 54
    // + dropdown(40) = 94.
    // Wait, 94 is > 80! We need to overflow something else?
    // Let's set available to 100 to only overflow btn2.
    const result = engine.calculate(100);
    expect(result.visible).toEqual(['btn1']); // sep1 is cleaned up
    expect(result.overflow).toEqual(['btn2']); // separators don't go to overflow
  });
});
