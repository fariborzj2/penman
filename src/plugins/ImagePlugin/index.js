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
          hideFooter: true,
          body: `
            <style>
              .penman-image-tabs {
                display: flex;
                border-bottom: 1px solid #ccc;
                margin-bottom: 15px;
              }
              .penman-image-tab {
                padding: 8px 16px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
              }
              .penman-image-tab.active {
                border-bottom-color: #007bff;
                color: #007bff;
                font-weight: bold;
              }
              .penman-image-tab-content {
                display: none;
              }
              .penman-image-tab-content.active {
                display: block;
              }
            </style>

            <div class="penman-image-tabs">
              <div class="penman-image-tab active" data-tab="url">URL</div>
              <div class="penman-image-tab" data-tab="upload">Upload</div>
              <div class="penman-image-tab" data-tab="gallery">Gallery</div>
            </div>

            <div class="penman-image-tab-content active" id="penman-tab-url">
              <div style="margin-bottom: 10px;">
                <label style="display:block;margin-bottom:5px;">Image URL</label>
                <input type="text" id="penman-image-url-input" class="penman-input" placeholder="https://..." style="width: 100%; box-sizing: border-box;" />
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display:block;margin-bottom:5px;">Alternative Text (Optional)</label>
                <input type="text" id="penman-image-alt-input" class="penman-input" placeholder="Image description" style="width: 100%; box-sizing: border-box;" />
              </div>
              <div style="text-align: right;">
                <button type="button" class="penman-btn" id="penman-image-url-cancel">Cancel</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-url-submit">Insert</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-upload">
              <div style="margin-bottom: 15px; border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #666;">Drag and drop an image here, or browse.</p>
                <input type="file" id="penman-image-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;" />
                <button type="button" class="penman-btn" onclick="document.getElementById('penman-image-file-input').click()">Browse Files</button>
              </div>
              <div style="text-align: right;">
                <button type="button" class="penman-btn" id="penman-image-upload-cancel">Cancel</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-upload-submit">Upload</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-gallery">
              <div style="text-align: center; color: #666; padding: 20px;">
                <p>Gallery is empty or not configured.</p>
              </div>
              <div style="text-align: right;">
                <button type="button" class="penman-btn" id="penman-image-gallery-cancel">Close</button>
              </div>
            </div>
          `
        });

        const elModal = modal.element || modal.modalElement;

        // Tab Switching Logic
        const tabs = elModal.querySelectorAll('.penman-image-tab');
        const contents = elModal.querySelectorAll('.penman-image-tab-content');

        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            elModal.querySelector('#penman-tab-' + tab.dataset.tab).classList.add('active');
          });
        });

        // URL Submit Logic
        const urlSubmit = elModal.querySelector('#penman-image-url-submit');
        if (urlSubmit) {
          urlSubmit.addEventListener('click', () => {
            const urlInput = elModal.querySelector('#penman-image-url-input');
            const altInput = elModal.querySelector('#penman-image-alt-input');
            const url = urlInput ? urlInput.value.trim() : '';
            const alt = altInput ? altInput.value.trim() : '';

            if (url) {
              try {
                editor.image.insertUntrustedURL(url, alt);
                modal.close();
              } catch (err) {
                alert('Invalid Image URL');
              }
            }
          });
        }

        // Upload Submit Logic
        const uploadSubmit = elModal.querySelector('#penman-image-upload-submit');
        const fileInput = elModal.querySelector('#penman-image-file-input');

        if (uploadSubmit && fileInput) {
          uploadSubmit.addEventListener('click', () => {
             const files = fileInput.files;
             if (files && files.length > 0) {
                 try {
                     editor.image.upload(Array.from(files));
                     modal.close();
                 } catch (err) {
                     alert('Upload error: ' + err.message);
                 }
             } else {
                 alert('Please select a file first.');
             }
          });
        }

        // Cancel Buttons Logic
        const cancelIds = ['#penman-image-url-cancel', '#penman-image-upload-cancel', '#penman-image-gallery-cancel'];
        cancelIds.forEach(id => {
            const btn = elModal.querySelector(id);
            if (btn) {
                btn.addEventListener('click', () => modal.close());
            }
        });


        // Focus the input

        setTimeout(() => {
          const input = (modal.element || modal.modalElement).querySelector('#penman-image-url-input');
          if (input) input.focus();
        }, 10);

      }
    });
  }

  // Note: The UI integration (modals, context menus) is separated. This core module provides the execution layer.
  // the execution layer and exposes events/commands.
}

export * from './security/index.js';
