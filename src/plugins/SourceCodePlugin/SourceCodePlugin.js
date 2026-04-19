export function setupSourceCodePlugin(editor) {
  // Add source code button to registry
  editor.ui.registry.addButton('sourcecode', {
    icon: 'sourcecode',
    tooltip: 'Source Code (Ctrl+Shift+S)',
    onClick: () => openSourceCodeModal(editor)
  });

  // Handle keyboard shortcut Ctrl+Shift+S
  editor.root.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      openSourceCodeModal(editor);
    }
  });
}

function openSourceCodeModal(editor) {
  // Save current selection to restore if canceled
  const savedSelection = editor.selection.save();

  const modal = editor.ui.createModal({
    title: 'Source Code',
    body: `<div id="penman-source-code-container" style="width: 100%; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; padding: 10px;">
             Loading editor...
           </div>`,
    submitText: 'Save',
    cancelText: 'Cancel',
    onSubmit: () => {
      // Stub for now
      editor.selection.restore(savedSelection);
    },
    onCancel: () => {
      editor.selection.restore(savedSelection);
      return true;
    }
  });

  // Custom styling to fix modal sizing for source code
  const modalEl = document.querySelector('.penman-modal');
  if (modalEl) {
    modalEl.style.width = '800px';
    modalEl.style.maxWidth = '95vw';
  }
}
