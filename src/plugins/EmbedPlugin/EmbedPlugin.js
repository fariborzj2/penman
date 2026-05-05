import { EmbedModal } from './ui/EmbedModal.js';

export function setupEmbedPlugin(editor) {
  const root = editor.editableArea;

  editor.embed = {
    insertNode: (htmlContent) => {
      // Parse the HTML content to extract the embed wrapper
      const template = document.createElement('template');
      template.innerHTML = htmlContent.trim();
      
      const content = template.content;
      
      // Look for iframe or embed tags, or wrap raw string if necessary.
      // The modal should already provide the <figure> wrapper or just the raw HTML.
      // Let's create a block figure for it to safely insert it into Editor.
      const figure = document.createElement('figure');
      figure.className = 'penman-embed-block';
      figure.setAttribute('contenteditable', 'false');
      
      const wrapper = document.createElement('div');
      wrapper.className = 'penman-embed-wrapper';
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.overflow = 'hidden';
      // simple responsive ratio for testing
      wrapper.style.paddingBottom = '56.25%'; // 16:9 
      
      Array.from(content.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          node.style.position = 'absolute';
          node.style.top = '0';
          node.style.left = '0';
          node.style.width = '100%';
          node.style.height = '100%';
        }
        wrapper.appendChild(node);
      });

      // Overlay to capture pointer events (clicks) so the node can be selected
      const overlay = document.createElement('div');
      overlay.className = 'penman-embed-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.zIndex = '10';
      overlay.style.cursor = 'pointer';

      wrapper.appendChild(overlay);
      figure.appendChild(wrapper);

      // Use core selection manager to safely insert block element
      const selection = window.getSelection();
      
      // Fallback if no selection is active, use the root element
      if (!selection || selection.rangeCount === 0) {
          root.appendChild(figure);
          editor.history.pushImmediate();
          editor.emit('change', editor.getContent());
          return;
      }

      if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        
        let currentBlock = range.startContainer;
        if (currentBlock.nodeType === Node.TEXT_NODE) {
            currentBlock = currentBlock.parentNode;
        }
        
        root.focus();
        
        if (editor.selection && typeof editor.selection.clearNodeSelection === 'function') {
           editor.selection.clearNodeSelection();
        }

        const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'];
        let blockParent = currentBlock;
        while (blockParent && blockParent !== root) {
            if (blockTags.includes(blockParent.tagName)) break;
            blockParent = blockParent.parentNode;
        }

        if (blockParent && blockParent !== root) {
           if (blockParent.textContent.trim() === '' && blockParent.tagName === 'P') {
              blockParent.parentNode.insertBefore(figure, blockParent);
              blockParent.remove();
           } else {
              blockParent.parentNode.insertBefore(figure, blockParent.nextSibling);
           }
        } else {
            root.appendChild(figure);
        }

        // Add a paragraph after the embed block if there isn't one
        if (!figure.nextSibling || figure.nextSibling.tagName !== 'P') {
           const p = document.createElement('p');
           p.innerHTML = '<br>';
           figure.parentNode.insertBefore(p, figure.nextSibling);
           
           const newRange = document.createRange();
           newRange.setStart(p, 0);
           newRange.collapse(true);
           selection.removeAllRanges();
           selection.addRange(newRange);
        } else {
           const newRange = document.createRange();
           newRange.setStart(figure.nextSibling, 0);
           newRange.collapse(true);
           selection.removeAllRanges();
           selection.addRange(newRange);
        }
        
        editor.history.pushImmediate();
        editor.emit('change', editor.getContent());
      }
    }
  };

  root.addEventListener('mousedown', (e) => {
    let target = e.target;
    while (target && target !== root) {
      if (target.tagName === 'FIGURE' && target.classList.contains('penman-embed-block')) {
        editor.selection.selectNode(target);
        return;
      }
      target = target.parentNode;
    }
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selectedNode = editor.selection.getSelectedNode();
      if (selectedNode && selectedNode.tagName === 'FIGURE' && selectedNode.classList.contains('penman-embed-block')) {
        e.preventDefault();
        editor.history.pushImmediate();
        
        const prev = selectedNode.previousElementSibling;
        const next = selectedNode.nextElementSibling;
        
        selectedNode.remove();
        editor.selection.clearNodeSelection();
        
        const selection = window.getSelection();
        const range = document.createRange();
        
        if (next && next.tagName === 'P') {
          range.setStart(next, 0);
        } else if (prev && prev.tagName === 'P') {
          range.setStart(prev, prev.childNodes.length);
        } else {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          root.appendChild(p);
          range.setStart(p, 0);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        editor.emit('change', editor.getContent());
      }
    }
  });

  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('embed', {
      text: editor.i18n.t('plugins.embed.title') || 'Embed',
      onAction: () => {
        const modal = new EmbedModal(editor);
        // modal.open() is now called internally by the class to avoid double-opening issues
      }
    });
  }
}
