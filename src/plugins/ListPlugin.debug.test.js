/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

describe('Range debug', () => {
  it('checks range overlap detection', () => {
    const editableArea = document.createElement('div');
    editableArea.innerHTML = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    document.body.appendChild(editableArea);

    const li2 = editableArea.querySelectorAll('li')[1];

    const range = document.createRange();
    range.selectNodeContents(li2);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    const sel = window.getSelection();
    console.log('isCollapsed:', sel.isCollapsed);
    console.log('rangeCount:', sel.rangeCount);
    console.log('startContainer:', sel.getRangeAt(0).startContainer.nodeName, sel.getRangeAt(0).startContainer.textContent);
    console.log('commonAncestor:', sel.getRangeAt(0).commonAncestorContainer.nodeName);

    const r = sel.getRangeAt(0);
    const allLIs = editableArea.querySelectorAll('li');
    allLIs.forEach(li => {
      const liRange = document.createRange();
      liRange.selectNodeContents(li);
      const startToEnd = r.compareBoundaryPoints(Range.START_TO_END, liRange);
      const endToStart = r.compareBoundaryPoints(Range.END_TO_START, liRange);
      console.log(`li "${li.textContent}": startToEnd=${startToEnd}, endToStart=${endToStart}, overlap=${startToEnd <= 0 && endToStart >= 0}`);
    });

    document.body.removeChild(editableArea);
    expect(true).toBe(true);
  });
});
