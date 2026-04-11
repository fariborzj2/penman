export function setupBlockTypePlugin(editor) {
  // Define default block types if none provided in options
  const defaultBlockTypes = [
    { name: 'Paragraph', cmd: 'p' },
    { name: 'Heading 1', cmd: 'h1' },
    { name: 'Heading 2', cmd: 'h2' },
    { name: 'Heading 3', cmd: 'h3' },
    { name: 'Heading 4', cmd: 'h4' },
    { name: 'Heading 5', cmd: 'h5' },
    { name: 'Heading 6', cmd: 'h6' },
    { name: 'Blockquote', cmd: 'blockquote' }
  ];

  const blockTypes = editor.options.blockTypes || defaultBlockTypes;

  // Track the current active block type based on the selection
  let currentBlockType = blockTypes[0].name;

  // The rendering function for the dropdown content
  const renderDropdownContent = () => {
    const container = document.createElement('div');
    container.className = 'penman-blocktype-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.className = 'penman-blocktype-search';
    searchInput.style.margin = '5px';
    searchInput.style.padding = '5px';
    searchInput.style.boxSizing = 'border-box';

    // Scrollable list container
    const listContainer = document.createElement('div');
    listContainer.className = 'penman-blocktype-list';
    listContainer.style.maxHeight = '200px';
    listContainer.style.overflowY = 'auto';

    // Render items
    const renderItems = (filter = '') => {
      listContainer.innerHTML = '';
      const lowerFilter = filter.toLowerCase();

      blockTypes.forEach(block => {
        if (block.name.toLowerCase().includes(lowerFilter)) {
          const item = document.createElement('div');
          item.className = 'penman-blocktype-item';
          item.style.padding = '8px 12px';
          item.style.cursor = 'pointer';

          // Render item specifically based on its tag to mimic how it will look in the editor
          const innerTag = document.createElement(block.cmd);
          innerTag.style.margin = '0';
          innerTag.style.padding = '0';
          innerTag.style.fontSize = 'inherit';
          innerTag.style.fontWeight = 'inherit';
          innerTag.textContent = block.name;

          // Re-apply some native-like styling for headings inside the dropdown to match the target UI
          if (block.cmd.startsWith('h')) {
             innerTag.style.fontWeight = 'bold';
             const level = parseInt(block.cmd.charAt(1), 10);
             if (level === 1) innerTag.style.fontSize = '2em';
             if (level === 2) innerTag.style.fontSize = '1.5em';
             if (level === 3) innerTag.style.fontSize = '1.17em';
             if (level === 4) innerTag.style.fontSize = '1em';
             if (level === 5) innerTag.style.fontSize = '0.83em';
             if (level === 6) innerTag.style.fontSize = '0.67em';
          }

          item.appendChild(innerTag);

          if (block.name === currentBlockType) {
            item.classList.add('penman-blocktype-item-active');
          }

          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
          });

          item.addEventListener('click', (e) => {
            e.preventDefault();
            // Execute the command without clearing selection markers here,
            // the command manager takes care of selection internally.
            editor.execCommand('formatBlock', block.cmd);

            // Trigger outside click to close the dropdown (or we could expose close on dropdown instance)
            document.body.click();
          });

          listContainer.appendChild(item);
        }
      });
    };

    renderItems();

    searchInput.addEventListener('input', (e) => {
      renderItems(e.target.value);
    });

    // Prevent input clicks from closing the dropdown
    searchInput.addEventListener('click', (e) => e.stopPropagation());

    container.appendChild(searchInput);
    container.appendChild(listContainer);

    return container;
  };

  // Register the dropdown
  editor.ui.registry.addDropdown('blocktype', {
    text: 'Paragraph', // Default label
    render: renderDropdownContent,
    onOpen: () => {
      // Save selection when opening to maintain it during search/interaction
      editor.selection.save();
    },
    onClose: () => {
      // Clean up markers if we close without changing
      // Note: If formatBlock was executed, the command manager already handled markers,
      // but clearSaved is safe to call anyway.
      editor.selection.clearSaved();
    }
  });

  // Listen to selection changes to update the active block type
  editor.on('selectionChange', () => {
    // Determine current block type based on selection
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    // Find the closest block element within the editor
    let activeTag = 'p'; // default
    while (node && node !== editor.editableArea && node.parentNode) {
      const tagName = node.tagName ? node.tagName.toLowerCase() : '';
      const match = blockTypes.find(b => b.cmd === tagName);
      if (match) {
        activeTag = tagName;
        break;
      }
      node = node.parentNode;
    }

    const activeBlock = blockTypes.find(b => b.cmd === activeTag) || blockTypes[0];

    if (currentBlockType !== activeBlock.name) {
      currentBlockType = activeBlock.name;
      // Find the dropdown button and update its text
      const btn = editor.container.querySelector('.penman-btn-blocktype');
      if (btn) {
        btn.textContent = currentBlockType;
      }
    }
  });
}
