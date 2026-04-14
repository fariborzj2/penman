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

  // Normalizes a CSS style key to valid camelCase
  const normalizeStyleKey = (key) => {
    // Basic camelCase conversion for kebab-case (if needed)
    const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    
    // Test if key exists on empty style object
    const el = document.createElement('div');
    if (camelKey in el.style) {
      return camelKey;
    }
    
    // Some common fixes
    if (camelKey.toLowerCase() === 'background') return 'background';
    if (camelKey.toLowerCase() === 'color') return 'color';
    if (camelKey.toLowerCase() === 'borderright') return 'borderRight';
    if (camelKey.toLowerCase() === 'borderleft') return 'borderLeft';
    if (camelKey.toLowerCase() === 'bordertop') return 'borderTop';
    if (camelKey.toLowerCase() === 'borderbottom') return 'borderBottom';
    if (camelKey.toLowerCase() === 'padding') return 'padding';
    if (camelKey.toLowerCase() === 'margin') return 'margin';

    // If still invalid, ignore
    return null;
  };

  // Safely applies styles
  const applyStyles = (element, styles) => {
    if (!styles || typeof styles !== 'object') return;
    for (const [key, value] of Object.entries(styles)) {
      const normalKey = normalizeStyleKey(key);
      if (normalKey) {
        try {
          element.style[normalKey] = value;
        } catch (e) {
          // silently ignore invalid values
        }
      }
    }
  };

  // Register the SET_BLOCK_TYPE command
  editor.commands.register('SET_BLOCK_TYPE', {
    execute: (ed, blockDef) => {
      // 1. Find all block-level elements currently selected
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      const range = sel.getRangeAt(0);
      
      // Before formatting, let's just use execCommand
      document.execCommand('formatBlock', false, blockDef.cmd);
      
      // Now find all affected blocks in the selection to apply styles/classes
      // To do this reliably, we should use TreeWalker on the selection range.
      const selAfter = window.getSelection();
      if (!selAfter || selAfter.rangeCount === 0) return;
      const rangeAfter = selAfter.getRangeAt(0);

      const blocksToStyle = [];

      // Find all top-level blocks in the editable area that intersect the selection
      Array.from(editor.editableArea.children).forEach(child => {
         const nodeRange = document.createRange();
         nodeRange.selectNodeContents(child);
         // Check if child intersects with the range
         const intersects = rangeAfter.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1 &&
                            rangeAfter.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
                            
        if (intersects || selAfter.containsNode(child, true)) {
           if (child.tagName && child.tagName.toLowerCase() === blockDef.cmd.toLowerCase()) {
             blocksToStyle.push(child);
           }
        }
      });
      
      // If selection was collapsed, the above might not catch it if containsNode fails.
      if (blocksToStyle.length === 0) {
         let node = selAfter.anchorNode;
         if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
         while (node && node !== editor.editableArea) {
           if (node.tagName && node.tagName.toLowerCase() === blockDef.cmd.toLowerCase()) {
             blocksToStyle.push(node);
             break;
           }
           node = node.parentNode;
         }
      }

      // Apply class and styles
      blocksToStyle.forEach(block => {
        // Find existing block types to remove their classes (prevent style pollution)
        // Only remove classes that match any of our configured blockTypes
        const blockTypeClasses = blockTypes.map(b => b.class).filter(c => c);
        blockTypeClasses.forEach(c => {
          block.classList.remove(c);
        });

        // Apply new class
        if (blockDef.class) {
          block.classList.add(blockDef.class);
        }
      });
    }
  });

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

          // Apply optionStyle if available
          if (block.optionStyle) {
            applyStyles(item, block.optionStyle);
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
            
            // Execute our new custom command
            editor.execCommand('SET_BLOCK_TYPE', block);

            // Trigger outside click to close the dropdown
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
      editor.selection.save();
    },
    onClose: () => {
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
    let activeTag = 'p';
    let activeClass = '';
    
    while (node && node !== editor.editableArea && node.parentNode) {
      const tagName = node.tagName ? node.tagName.toLowerCase() : '';
      
      // Instead of just finding by tag, try finding exact match with class first
      let match = null;
      
      if (node.className) {
         match = blockTypes.find(b => b.cmd === tagName && b.class === node.className);
      }
      
      if (!match) {
         match = blockTypes.find(b => b.cmd === tagName && !b.class);
      }
      
      if (match) {
        activeTag = tagName;
        activeClass = node.className || '';
        break;
      }
      node = node.parentNode;
    }

    let activeBlock = blockTypes.find(b => b.cmd === activeTag && (b.class || '') === activeClass);
    if (!activeBlock) {
      activeBlock = blockTypes.find(b => b.cmd === activeTag && !b.class) || blockTypes[0];
    }

    if (currentBlockType !== activeBlock.name) {
      currentBlockType = activeBlock.name;
      const btn = editor.container.querySelector('.penman-btn-blocktype');
      if (btn) {
        btn.textContent = currentBlockType;
      }
    }
  });
}
