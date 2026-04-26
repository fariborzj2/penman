import { SecurityValidation } from './security/SecurityValidation.js';
import { ProviderRegistry } from './core/ProviderRegistry.js';
import { YoutubeProvider } from './providers/YoutubeProvider.js';
import { AparatProvider } from './providers/AparatProvider.js';
import { createCustomProvider } from './providers/CustomProvider.js';
import { DirectVideoProvider, DirectAudioProvider } from './providers/DirectMediaProvider.js';
import { MediaRenderer } from './rendering/MediaRenderer.js';
import { MediaModal } from './ui/MediaModal.js';

export function setupMediaPlugin(editor) {
  const root = editor.editableArea;

  // Initialize Security and Registry
  const whitelistExt = editor.options?.media?.whitelist || [];
  const securityValidator = new SecurityValidation({ whitelist: whitelistExt });
  
  const registry = new ProviderRegistry();
  registry.register(DirectVideoProvider);
  registry.register(DirectAudioProvider);
  registry.register(YoutubeProvider);
  registry.register(AparatProvider);
  registry.register(createCustomProvider(securityValidator));

  // Expose API on editor
  editor.media = {
    registry,
    insertNode: (mediaData) => {
      // Create DOM node
      const node = MediaRenderer.render(mediaData);
      
      // Use core selection manager to safely insert block element
      const selection = window.getSelection();
      
      // Fallback if no selection is active, use the root element
      if (!selection || selection.rangeCount === 0) {
          root.appendChild(node);
          editor.history.pushImmediate();
          editor.emit('change', editor.getContent());
          return;
      }

      if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        
        // Find nearest block parent to prevent inserting inline
        let currentBlock = range.startContainer;
        if (currentBlock.nodeType === Node.TEXT_NODE) {
            currentBlock = currentBlock.parentNode;
        }
        
        // Ensure focus and state
        root.focus();
        
        // Use SelectionManager to ensure markers are cleared properly before we manipulate DOM manually.
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
              blockParent.parentNode.insertBefore(node, blockParent);
              blockParent.remove();
           } else {
              // Standard behavior for inserting block nodes after the current block
              blockParent.parentNode.insertBefore(node, blockParent.nextSibling);
           }
        } else {
            root.appendChild(node);
        }

        // Add a paragraph after the media block if there isn't one
        if (!node.nextSibling || node.nextSibling.tagName !== 'P') {
           const p = document.createElement('p');
           p.innerHTML = '<br>';
           node.parentNode.insertBefore(p, node.nextSibling);
           
           // Move caret to new paragraph
           const newRange = document.createRange();
           newRange.setStart(p, 0);
           newRange.collapse(true);
           selection.removeAllRanges();
           selection.addRange(newRange);
        } else {
           // Move caret to next sibling
           const newRange = document.createRange();
           newRange.setStart(node.nextSibling, 0);
           newRange.collapse(true);
           selection.removeAllRanges();
           selection.addRange(newRange);
        }
        
        editor.history.pushImmediate();
        editor.emit('change', editor.getContent());
      }
    },
    insertURL: (url) => {
      const data = registry.process(url);
      if (data) {
        editor.media.insertNode(data);
      } else {
        throw new Error('Unsupported Media URL');
      }
    },
    updateNode: (oldNode, mediaData) => {
      const newNode = MediaRenderer.render(mediaData);
      
      // Replace the old node in the DOM
      oldNode.parentNode.replaceChild(newNode, oldNode);
      
      // Update selection to the new node to maintain UI state seamlessly
      editor.selection.selectNode(newNode);
      
      editor.history.pushImmediate();
      editor.emit('change', editor.getContent());
    }
  };

  // Block Node Selection & Keyboard Interaction Logic
  root.addEventListener('mousedown', (e) => {
    let target = e.target;
    // Walk up the tree just in case the click happened deep inside (though iframe eats clicks generally)
    while (target && target !== root) {
      if (target.tagName === 'FIGURE' && target.classList.contains('penman-media-block')) {
        // Only select if the click wasn't inside something else interactive if we ever add captions
        editor.selection.selectNode(target);
        return;
      }
      target = target.parentNode;
    }
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selectedNode = editor.selection.getSelectedNode();
      if (selectedNode && selectedNode.tagName === 'FIGURE' && selectedNode.classList.contains('penman-media-block')) {
        e.preventDefault();
        editor.history.pushImmediate();
        
        const prev = selectedNode.previousElementSibling;
        const next = selectedNode.nextElementSibling;
        
        selectedNode.remove();
        editor.selection.clearNodeSelection();
        
        // Caret repositioning
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

  // Register UI Button
  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('media', {
      text: editor.i18n.t('plugins.media.title'),
      onAction: () => {
        let existingData = null;
        const selectedNode = editor.selection.getSelectedNode();
        if (selectedNode && selectedNode.tagName === 'FIGURE' && selectedNode.classList.contains('penman-media-block')) {
            existingData = {
                id: selectedNode.dataset.mediaId,
                provider: selectedNode.dataset.provider,
                kind: selectedNode.dataset.kind,
                src: selectedNode.dataset.src,
                embedUrl: selectedNode.querySelector('iframe, video, audio')?.src || '',
                title: selectedNode.dataset.title || '',
                poster: selectedNode.dataset.poster || '',
                controls: selectedNode.dataset.controls === 'true',
                autoplay: selectedNode.dataset.autoplay === 'true',
                aspectRatio: selectedNode.querySelector('.penman-media-wrapper')?.style.paddingBottom === '75%' ? '4/3' : '16/9',
                node: selectedNode // Pass the reference to replace it later
            };
        }
        const modal = new MediaModal(editor, registry, existingData);
        modal.open();
      }
    });
  }
}
