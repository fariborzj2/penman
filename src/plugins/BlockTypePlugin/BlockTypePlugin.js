export function setupBlockTypePlugin(editor) {
  // Define default block types if none provided in options
  const defaultBlockTypes = [
    { name: 'Paragraph', cmd: 'p', i18nKey: 'plugins.blockType.paragraph' },
    { name: 'Heading 1', cmd: 'h1', i18nKey: 'plugins.blockType.heading1' },
    { name: 'Heading 2', cmd: 'h2', i18nKey: 'plugins.blockType.heading2' },
    { name: 'Heading 3', cmd: 'h3', i18nKey: 'plugins.blockType.heading3' },
    { name: 'Heading 4', cmd: 'h4', i18nKey: 'plugins.blockType.heading4' },
    { name: 'Heading 5', cmd: 'h5', i18nKey: 'plugins.blockType.heading5' },
    { name: 'Heading 6', cmd: 'h6', i18nKey: 'plugins.blockType.heading6' },
    { name: 'Blockquote', cmd: 'blockquote', i18nKey: 'plugins.blockType.blockquote' },
    { name: 'Success', cmd: 'div', class: 'green-block', i18nKey: 'plugins.blockType.success', optionStyle: { color: '#166534', background: '#dcfce7', fontWeight: 'bold', borderRight: '3px solid #22c55e' } },
    { name: 'Info', cmd: 'div', class: 'blue-block', i18nKey: 'plugins.blockType.info', optionStyle: { color: '#1e3a8a', background: '#dbeafe', fontWeight: 'bold', borderRight: '3px solid #3b82f6' } },
    { name: 'Warning', cmd: 'div', class: 'orange-block', i18nKey: 'plugins.blockType.warning', optionStyle: { color: '#9a3412', background: '#ffedd5', fontWeight: 'bold', borderRight: '3px solid #f97316' } },
    { name: 'Danger', cmd: 'div', class: 'red-block', i18nKey: 'plugins.blockType.danger', optionStyle: { color: '#7f1d1d', background: '#fee2e2', fontWeight: 'bold', borderRight: '3px solid #ef4444' } }
  ];

  const blockTypes = (editor.options.blockTypes && editor.options.blockTypes.length > 0)
    ? editor.options.blockTypes
    : defaultBlockTypes;

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
      
      // Determine wrapper blocks vs inline-block formats
      const wrapperBlockTypes = ['blockquote', 'div', 'section', 'article', 'aside', 'main', 'header', 'footer'];
      const isWrapper = wrapperBlockTypes.includes(blockDef.cmd.toLowerCase());

      // Helper to find top-level block in the editor based on container and offset
      const resolveTopLevelBlock = (container, offset, isEnd = false) => {
        if (container === editor.editableArea) {
          if (isEnd && offset > 0) offset--;
          let targetNode = editor.editableArea.childNodes[offset];
          if (!targetNode) {
            return editor.editableArea.lastElementChild;
          }
          
          while (targetNode && targetNode.nodeType !== Node.ELEMENT_NODE) {
             targetNode = isEnd ? targetNode.previousSibling : targetNode.nextSibling;
          }
          return targetNode || (isEnd ? editor.editableArea.firstElementChild : editor.editableArea.lastElementChild);
        }

        let curr = container;
        while (curr && curr.parentNode !== editor.editableArea && curr !== editor.editableArea) {
          curr = curr.parentNode;
        }
        return curr === editor.editableArea ? null : curr;
      };

      // Collect all top-level blocks in the selection range
      const blocksToStyle = [];
      const startBlock = resolveTopLevelBlock(range.startContainer, range.startOffset) || editor.editableArea.firstElementChild;
      const endBlock = resolveTopLevelBlock(range.endContainer, range.endOffset, true) || editor.editableArea.lastElementChild;

      if (startBlock && endBlock) {
        let inRange = false;
        for (const child of Array.from(editor.editableArea.children)) {
          if (child === startBlock) inRange = true;
          if (inRange) blocksToStyle.push(child);
          if (child === endBlock) break;
        }
      }

      // 1.2 Save native range reference variables to restore exact cursor
      const originalStartContainer = range.startContainer;
      const originalStartOffset = range.startOffset;
      const originalEndContainer = range.endContainer;
      const originalEndOffset = range.endOffset;

      // 1.3 Pre-process blocks to unwrap existing wrappers recursively
      const unwrappedBlocks = [];
      let targetWrapperFound = false;
      let nonTargetWrapperFound = false;

      const unwrapBlock = (block) => {
        const tagName = block.tagName ? block.tagName.toLowerCase() : '';
        const isBlockWrapper = wrapperBlockTypes.includes(tagName);

        if (isBlockWrapper) {
          const hasSameTag = tagName === blockDef.cmd.toLowerCase();
          const hasSameClass = blockDef.class ? block.classList.contains(blockDef.class) : !block.className;
          
          if (hasSameTag && hasSameClass && isWrapper) {
            targetWrapperFound = true;
          } else {
            nonTargetWrapperFound = true;
          }

          const children = Array.from(block.childNodes);
          children.forEach(child => {
            block.parentNode.insertBefore(child, block);
            if (child.nodeType === Node.ELEMENT_NODE && wrapperBlockTypes.includes(child.tagName.toLowerCase())) {
              unwrapBlock(child);
            } else if (child.nodeType === Node.ELEMENT_NODE || (child.nodeType === Node.TEXT_NODE && child.textContent.trim())) {
              if (!unwrappedBlocks.includes(child)) unwrappedBlocks.push(child);
            }
          });
          block.parentNode.removeChild(block);
        } else {
          // It's a non-wrapper top-level block
          nonTargetWrapperFound = true;
          if (!unwrappedBlocks.includes(block)) unwrappedBlocks.push(block);
        }
      };

      blocksToStyle.forEach(unwrapBlock);
      const togglingOff = targetWrapperFound && !nonTargetWrapperFound;

      if (sel.isCollapsed && unwrappedBlocks.length === 0 && !isWrapper) {
          let node = sel.anchorNode;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
          let changed = false;
          while (node && node !== editor.editableArea) {
             if (node.tagName && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName.toUpperCase())) {
                 if (node.tagName.toLowerCase() !== blockDef.cmd.toLowerCase()) {
                     const newBlock = document.createElement(blockDef.cmd);
                     while (node.firstChild) {
                         newBlock.appendChild(node.firstChild);
                     }
                     node.parentNode.replaceChild(newBlock, node);
                     
                     // Restore selection accurately
                     const newRange = document.createRange();
                     // Use the original text node and offset instead of collapsing to true
                     try {
                         newRange.setStart(originalStartContainer, originalStartOffset);
                         newRange.setEnd(originalEndContainer, originalEndOffset);
                     } catch(e) {
                         // Fallback safely if nodes changed
                         newRange.selectNodeContents(newBlock);
                         newRange.collapse(false);
                     }
                     sel.removeAllRanges();
                     sel.addRange(newRange);
                     blocksToStyle.push(newBlock);
                 } else {
                     blocksToStyle.push(node);
                 }
                 changed = true;
                 break;
             }
             node = node.parentNode;
          }
          if (!changed) {
              document.execCommand('formatBlock', false, blockDef.cmd);
          }
      } else if (isWrapper && unwrappedBlocks.length > 0) {
        let wrapper = null;
        if (!togglingOff) {
          // Wrapper logic: create one parent wrapper for all selected blocks
          wrapper = document.createElement(blockDef.cmd);
          if (blockDef.class) {
            wrapper.className = blockDef.class;
          }
          unwrappedBlocks[0].parentNode.insertBefore(wrapper, unwrappedBlocks[0]);
          unwrappedBlocks.forEach(b => wrapper.appendChild(b));
        }

        // Restore precise original selection (nodes moved, but not destroyed)
        sel.removeAllRanges();
        const newRange = document.createRange();
        try {
          newRange.setStart(originalStartContainer, originalStartOffset);
          newRange.setEnd(originalEndContainer, originalEndOffset);
          sel.addRange(newRange);
        } catch (e) {
          // Fallback if node structure was somehow compromised
          if (wrapper) {
            newRange.selectNodeContents(wrapper);
          } else {
            newRange.selectNodeContents(unwrappedBlocks[unwrappedBlocks.length - 1]);
          }
          newRange.collapse(false); // Move to end of block safely
          sel.addRange(newRange);
        }

        // We already applied the class if creating a new wrapper, so no need for further styling
        return;
      } else {
        // Standard execCommand formatting (e.g., h1, p)
        // If we unwrapped wrappers, our native selection might be lost because the wrapper node was removed.
        // We must ensure the selection is restored onto the unwrapped blocks before calling execCommand.
        if (unwrappedBlocks.length > 0) {
           sel.removeAllRanges();
           const newRange = document.createRange();
           newRange.setStartBefore(unwrappedBlocks[0]);
           newRange.setEndAfter(unwrappedBlocks[unwrappedBlocks.length - 1]);
           sel.addRange(newRange);
        }

        if (!(sel.isCollapsed && unwrappedBlocks.length === 0 && !isWrapper)) {
            document.execCommand('formatBlock', false, blockDef.cmd);
        }

        // Re-calculate blocks after execCommand
        const selAfter = window.getSelection();
        if (selAfter && selAfter.rangeCount > 0) {
          const rangeAfter = selAfter.getRangeAt(0);
          blocksToStyle.length = 0; // Clear previous blocks
          
          Array.from(editor.editableArea.children).forEach(child => {
            const nodeRange = document.createRange();
            nodeRange.selectNodeContents(child);
            const intersects = rangeAfter.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1 &&
                               rangeAfter.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
                               
            if (intersects || selAfter.containsNode(child, true)) {
              if (child.tagName && child.tagName.toLowerCase() === blockDef.cmd.toLowerCase()) {
                blocksToStyle.push(child);
              }
            }
          });

          // Fallback if collapsed
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
        }
      }

      // Apply class and styles
      blocksToStyle.forEach(block => {
        // Find existing block types to remove their classes (prevent style pollution)
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
        const displayName = block.i18nKey ? editor.i18n.t(block.i18nKey) : block.name;
        if (displayName.toLowerCase().includes(lowerFilter)) {
          const item = document.createElement('div');
          item.className = 'penman-blocktype-item';
          item.style.padding = '4px 12px';
          item.style.marginBottom = '4px';
          item.style.cursor = 'pointer';

          // Render item specifically based on its tag to mimic how it will look in the editor
          const innerTag = document.createElement(block.cmd);
          innerTag.style.margin = '0';
          innerTag.style.padding = '0';
          innerTag.style.fontSize = 'inherit';
          innerTag.style.fontWeight = 'inherit';
          innerTag.textContent = displayName;

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
    text: editor.i18n.t('plugins.blockType.paragraph'), // Default label
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
        btn.textContent = activeBlock.i18nKey ? editor.i18n.t(activeBlock.i18nKey) : currentBlockType;
      }
    }
  });
}
