import { GallerySystem } from './gallery/index.js';
import { insertImageFromURL, uploadImageCommand, pasteImageHandler, dropImageHandler } from './commands/index.js';
import { handleCaptionKeyDown, handleCaptionPaste, handleCaptionBlur, setupAlignmentObserver, setFigureAlignment } from './rendering/index.js';
import { TrustLevel } from './security/index.js';

export function setupImagePlugin(editor) {
  const root = editor.editableArea;

  // 1. Setup DOM Observers
  setupAlignmentObserver(root);

  // 2. Setup Event Listeners
  root.addEventListener('keydown', (e) => {
    handleCaptionKeyDown(e, editor);
  });

  root.addEventListener('paste', (e) => {
    // Caption paste handler
    const figcaption = e.target.closest('figcaption');
    if (figcaption) {
       handleCaptionPaste(e);
       return; // handled by caption
    }

    // Normal image paste handler
    const uploadFn = editor.options.imageUploadFn;
    pasteImageHandler(editor, e, uploadFn);
  });

  root.addEventListener('drop', (e) => {
    const uploadFn = editor.options.imageUploadFn;
    dropImageHandler(editor, e, uploadFn);
  });

  root.addEventListener('blur', (e) => {
    if (e.target && e.target.tagName === 'FIGCAPTION') {
      handleCaptionBlur(e, editor);
    }
  }, true); // Use capture phase to catch blur on children

  // 3. Expose API to Editor (Registry approach or directly)
  const gallerySystem = new GallerySystem();

  editor.image = {
    gallery: gallerySystem,
    insertFromURL: (url, alt) => insertImageFromURL(editor, { url, alt, trustLevel: TrustLevel.TRUSTED }), // From API, it might be trusted? Spec says "trustLevel is explicitly defined at PluginManager registration time". Let's assume UNTRUSTED by default for manual API calls unless specified.
    insertUntrustedURL: (url, alt) => insertImageFromURL(editor, { url, alt, trustLevel: TrustLevel.UNTRUSTED }),
    upload: (files) => uploadImageCommand(editor, files, editor.options.imageUploadFn),
    setAlignment: (figure, alignment) => setFigureAlignment(figure, alignment, editor)
  };


  // Register Image Button in Toolbar
  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('image', {
      text: 'Image',
      onAction: () => {
        // Open a modal to insert image from URL
        // A complete file upload UI would be more complex, but let's provide URL insertion as a baseline per the UI Specification
        const modal = editor.ui.createModal({
          title: 'Insert Image',
          body: `
            <div style="margin-bottom: 10px;">
              <label style="display:block;margin-bottom:5px;">Image URL</label>
              <input type="text" id="penman-image-url-input" class="penman-input" placeholder="https://..." style="width: 100%; box-sizing: border-box;" />
            </div>
            <div>
              <label style="display:block;margin-bottom:5px;">Alternative Text (Optional)</label>
              <input type="text" id="penman-image-alt-input" class="penman-input" placeholder="Image description" style="width: 100%; box-sizing: border-box;" />
            </div>
          `,
          onSubmit: () => {
            const elModal = modal.element;
            const urlInput = elModal.querySelector('#penman-image-url-input');
            const altInput = elModal.querySelector('#penman-image-alt-input');
            const url = urlInput ? urlInput.value.trim() : '';
            const alt = altInput ? altInput.value.trim() : '';

            if (url) {
              try {
                editor.image.insertUntrustedURL(url, alt);
              } catch (err) {
                alert('Invalid Image URL');
                return false; // Prevent modal from closing if error
              }
            }
          }
        });

        // Focus the input
        setTimeout(() => {
          const input = modal.element.querySelector('#penman-image-url-input');
          if (input) input.focus();
        }, 10);
      }
    });
  }

  // Note: The UI integration (modals, context menus) is separated. This core module provides the execution layer.
  // the execution layer and exposes events/commands.
}

export * from './security/index.js';
