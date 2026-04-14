/**
 * 4.2 Alignment System (Consistent Source of Truth)
 * - Source of Truth: The `data-alignment` attribute on `figure`.
 * - Sync Rule: CSS classes (`.penman-align-center`) are deterministic derivatives. Any drift detected via MutationObserver forces the class to reset based on the data attribute.
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
        // Handle newly added figures
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'FIGURE' && node.classList.contains('penman-image')) {
              syncAlignmentClass(node);
            }
            // Check descendants
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

  // Clean existing align classes
  figure.classList.remove('penman-align-left', 'penman-align-center', 'penman-align-right');

  // Set correct class
  figure.classList.add(`penman-align-${alignment}`);
}

export function setFigureAlignment(figure, alignment, editor) {
  if (['left', 'center', 'right'].includes(alignment)) {
    figure.setAttribute('data-alignment', alignment);
    // The MutationObserver will handle the class update, but we trigger history here
    if (editor && editor.history) {
      // Small timeout to allow MutationObserver to fire and class to settle before history snapshot
      // Wait, spec says: "Alignment changes each trigger exactly ONE atomic snapshot."
      // Since it's synchronous DOM update, we can snapshot immediately.
      setTimeout(() => {
        editor.history.saveSnapshot();
      }, 0);
    }
  }
}
