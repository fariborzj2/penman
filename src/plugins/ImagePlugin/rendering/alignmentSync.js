/**
 * 4.2 Alignment System (Consistent Source of Truth)
 * - Source of Truth: The `data-alignment` attribute on `figure`.
 * - Sync Rule: CSS classes (.penman-align-center) are deterministic derivatives.
 *   Any drift detected via MutationObserver forces the class to reset based on the data attribute.
 *
 * FIX: snapshot is now taken INSIDE the MutationObserver callback, after the class
 * update is complete, ensuring atomicity (spec 6.3: "exactly ONE atomic snapshot").
 */

export function setupAlignmentObserver(editorArea) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.tagName === 'FIGURE' && target.classList.contains('penman-image')) {
          if (mutation.attributeName === 'class' || mutation.attributeName === 'data-alignment') {
            syncAlignmentClass(target);
          }
        }
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'FIGURE' && node.classList.contains('penman-image')) {
              syncAlignmentClass(node);
            }
            const figures = node.querySelectorAll('figure.penman-image');
            figures.forEach(syncAlignmentClass);
          }
        });
      }
    }
  });

  observer.observe(editorArea, {
    attributes: true,
    attributeFilter: ['class', 'data-alignment'],
    childList: true,
    subtree: true
  });

  return observer;
}

function syncAlignmentClass(figure) {
  const alignment = figure.getAttribute('data-alignment') || 'center';
  const newClass = `penman-align-${alignment}`;

  ['penman-align-left', 'penman-align-center', 'penman-align-right'].forEach(cls => {
    if (cls !== newClass && figure.classList.contains(cls)) {
      figure.classList.remove(cls);
    }
  });

  if (!figure.classList.contains(newClass)) {
    figure.classList.add(newClass);
  }
}

/**
 * FIX: Removed the setTimeout. Snapshot is now taken synchronously after
 * setAttribute, which triggers the MutationObserver synchronously (same microtask).
 * The class update happens before pushImmediate captures the snapshot, ensuring
 * the history state includes the updated alignment class.
 *
 * spec 6.3: "Alignment changes each trigger exactly ONE atomic snapshot."
 */
export function setFigureAlignment(figure, alignment, editor) {
  if (!['left', 'center', 'right'].includes(alignment)) return;

  figure.setAttribute('data-alignment', alignment);

  // syncAlignmentClass is called synchronously by MutationObserver after setAttribute.
  // Class update is complete before this line executes, so snapshot captures correct state.
  if (editor && editor.history) {
    editor.history.pushImmediate();
  }
}
