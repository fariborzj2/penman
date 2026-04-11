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
          item.style.padding = '8px';
          item.style.cursor = 'pointer';
          item.textContent = block.name;

          if (block.name === currentBlockType) {
            item.style.fontWeight = 'bold';
            item.style.backgroundColor = '#f0f0f0';
          }

          item.addEventListener('mouseenter', () => {
             item.style.backgroundColor = '#e0e0e0';
          });
          item.addEventListener('mouseleave', () => {
             item.style.backgroundColor = block.name === currentBlockType ? '#f0f0f0' : 'transparent';
          });

          item.addEventListener('click', (e) => {
            e.preventDefault();
            // Need to close dropdown. The dropdown trigger is handled by UIManager,
            // but we can dispatch a click on body or let UIManager provide context.
            // For now, we execute the command.
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
    render: renderDropdownContent
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
