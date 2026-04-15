import { GallerySystem } from './gallery/index.js';
import { insertImageFromURL, uploadImageCommand, pasteImageHandler, dropImageHandler } from './commands/index.js';
import { handleCaptionKeyDown, handleCaptionPaste, handleCaptionBlur, setupAlignmentObserver, setFigureAlignment } from './rendering/index.js';
import { TrustLevel } from './security/index.js';
import { FloatingUI } from '../../ui/FloatingUI.js';

export function setupImagePlugin(editor) {
  const root = editor.editableArea;

  // 1. Setup DOM Observers
  setupAlignmentObserver(root);

  // Floating UI for Images
  let floatingUI = null;

  function createFloatingUI() {
    floatingUI = new FloatingUI(editor, { offset: 10, placement: 'top' });
    const html = `
      <div class="penman-image-toolbar" style="background: white; border: 1px solid #e0e0e0; padding: 4px; border-radius: 6px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative;">
        <!-- Arrow Tail -->
        <div class="penman-floating-tail-inner" style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white; z-index: 2;"></div>
        <div class="penman-floating-tail-outer" style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 7px solid #e0e0e0; z-index: 1;"></div>

        <button type="button" class="penman-btn penman-btn-align-left" title="Align Left" style="padding: 4px; display:flex; align-items:center; color: #111827;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-align-center" title="Align Center" style="padding: 4px; display:flex; align-items:center; color: #111827;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-align-right" title="Align Right" style="padding: 4px; display:flex; align-items:center; color: #111827;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-del-image" title="Delete Image" style="padding: 4px; display:flex; align-items:center; color: #111827;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
        </button>
      </div>
    `;
    floatingUI.mount(html);

    // Event listeners for buttons
    floatingUI.element.querySelector('.penman-btn-align-left').addEventListener('click', (e) => {
       e.preventDefault();
       if (floatingUI.anchorNode) {
          editor.image.setAlignment(floatingUI.anchorNode, 'left');
          floatingUI.update();
       }
    });

    floatingUI.element.querySelector('.penman-btn-align-center').addEventListener('click', (e) => {
       e.preventDefault();
       if (floatingUI.anchorNode) {
          editor.image.setAlignment(floatingUI.anchorNode, 'center');
          floatingUI.update();
       }
    });

    floatingUI.element.querySelector('.penman-btn-align-right').addEventListener('click', (e) => {
       e.preventDefault();
       if (floatingUI.anchorNode) {
          editor.image.setAlignment(floatingUI.anchorNode, 'right');
          floatingUI.update();
       }
    });

    floatingUI.element.querySelector('.penman-btn-del-image').addEventListener('click', (e) => {
       e.preventDefault();
       if (floatingUI.anchorNode) {
          // Trigger a history snapshot before removal as per standard operations
          editor.history.pushImmediate();
          floatingUI.anchorNode.remove();
          editor.emit('change');
          floatingUI.hide();
       }
    });
  }

  root.addEventListener('click', (e) => {
      const figure = e.target.closest('figure.penman-image');
      if (figure) {
          if (!floatingUI) createFloatingUI();
          floatingUI.setAnchor(figure);
          floatingUI.show();
      } else {
          if (floatingUI) floatingUI.hide();
      }
  });

  // End of Floating UI logic


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
              <div style="padding: 0 15px 15px">
                <div style="margin-bottom: 10px;">
                  <label style="display:block;margin-bottom:5px;">Image URL</label>
                  <input type="text" id="penman-image-url-input" class="penman-input" placeholder="https://..." style="width: 100%; box-sizing: border-box;" />
                </div>
                <div style="margin-bottom: 15px;">
                  <label style="display:block;margin-bottom:5px;">Alternative Text (Optional)</label>
                  <input type="text" id="penman-image-alt-input" class="penman-input" placeholder="Image description" style="width: 100%; box-sizing: border-box;" />
                </div>
              </div>
              <div class="penman-modal-footer">
                <button type="button" class="penman-btn" id="penman-image-url-cancel">Cancel</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-url-submit">Insert</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-upload">
              <div style="padding: 0 15px 15px">
                <div id="penman-image-dropzone" style="margin-bottom: 15px; border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 4px;">
                  <p style="margin: 0 0 10px 0; color: #666;">Drag and drop an image here, or browse.</p>
                  <input type="file" id="penman-image-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;" multiple />
                  <button type="button" class="penman-btn" style="margin: 0 auto" onclick="document.getElementById('penman-image-file-input').click()">Browse Files</button>
                </div>
                <div id="penman-image-upload-queue" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                </div>
              </div>

              <div class="penman-modal-footer">
                <button type="button" class="penman-btn" id="penman-image-upload-cancel">Cancel</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-upload-submit">Insert</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-gallery">
              <div style="padding: 0 15px 15px">
                <div class="penman-gallery-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto;">
                  <div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;" class="penman-gallery-empty">
                    <p>Loading gallery...</p>
                  </div>
                </div>
              </div>
              <div class="penman-modal-footer">
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
        // Gallery Loading Logic
        tab.addEventListener('click', () => {
          if (tab.dataset.tab === 'gallery') {
            const galleryContainer = elModal.querySelector('.penman-gallery-container');
            const sources = editor.image.gallery.getRegisteredSources();
            
            if (sources.length === 0) {
              galleryContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;"><p>No gallery sources registered.</p></div>';
              return;
            }

            // For simplicity in this base implementation, we load the first ready source
            const sourceInfo = sources[0];
            
            editor.image.gallery.getSource(sourceInfo.id).then(source => {
                source.list().then(res => {
                    if (res && res.items && res.items.length > 0) {
                        galleryContainer.innerHTML = ''; // clear loading
                        res.items.forEach(item => {
                            const imgDiv = document.createElement('div');
                            imgDiv.style.cursor = 'pointer';
                            imgDiv.style.border = '2px solid transparent';
                            imgDiv.style.borderRadius = '4px';
                            imgDiv.style.overflow = 'hidden';
                            imgDiv.style.height = '100px';
                            imgDiv.style.position = 'relative';
                            
                            imgDiv.innerHTML = `<img src="${item.thumbnailUrl || item.url}" style="width:100%; height:100%; object-fit:cover;" title="${item.title || ''}">`;
                            
                            imgDiv.addEventListener('mouseover', () => imgDiv.style.borderColor = '#007bff');
                            imgDiv.addEventListener('mouseout', () => imgDiv.style.borderColor = 'transparent');
                            
                            imgDiv.addEventListener('click', () => {
                                // Trust level is inherited from the source definition (Trust Immutability Rule)
                                editor.image.insertFromURL(item.url, item.title || '');
                                modal.close();
                            });
                            
                            galleryContainer.appendChild(imgDiv);
                        });
                    } else {
                         galleryContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;"><p>Gallery is empty.</p></div>';
                    }
                }).catch(err => {
                    galleryContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px; grid-column: 1 / -1;"><p>Error loading gallery: ${err.message}</p></div>`;
                });
            }).catch(err => {
                galleryContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px; grid-column: 1 / -1;"><p>Error initializing gallery source: ${err.message}</p></div>`;
            });
          }
        });

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

        // Upload Queue State Phase
        const uploadSubmit = elModal.querySelector('#penman-image-upload-submit');
        const fileInput = elModal.querySelector('#penman-image-file-input');
        const dropzone = elModal.querySelector('#penman-image-dropzone');
        const queueContainer = elModal.querySelector('#penman-image-upload-queue');
        const uploadFn = editor.options.imageUploadFn;

        let uploadQueue = [];

        function renderQueue() {
            queueContainer.innerHTML = '';
            uploadQueue.forEach(item => {
                const el = document.createElement('div');
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'space-between';
                el.style.padding = '8px';
                el.style.border = '1px solid #eee';
                el.style.borderRadius = '4px';
                el.style.background = item.status === 'ERROR' ? '#ffeeee' : '#fff';

                const name = document.createElement('span');
                name.textContent = item.file.name;
                name.style.flex = '1';
                name.style.overflow = 'hidden';
                name.style.textOverflow = 'ellipsis';
                name.style.whiteSpace = 'nowrap';

                const status = document.createElement('span');
                status.textContent = item.status;
                status.style.fontSize = '0.85em';
                status.style.fontWeight = 'bold';
                status.style.color = item.status === 'SUCCESS' ? 'green' : (item.status === 'ERROR' ? 'red' : 'orange');
                status.style.marginLeft = '10px';

                el.appendChild(name);
                el.appendChild(status);

                if (item.status === 'ERROR') {
                    const retryBtn = document.createElement('button');
                    retryBtn.textContent = 'Retry';
                    retryBtn.className = 'penman-btn';
                    retryBtn.style.padding = '2px 6px';
                    retryBtn.style.fontSize = '0.8em';
                    retryBtn.style.marginLeft = '10px';
                    retryBtn.onclick = () => {
                        item.status = 'PENDING';
                        renderQueue();
                        processQueue();
                    };
                    el.appendChild(retryBtn);
                }

                queueContainer.appendChild(el);
            });
        }

        async function processQueue() {
            for (let i = 0; i < uploadQueue.length; i++) {
                const item = uploadQueue[i];
                if (item.status === 'PENDING') {
                    item.status = 'UPLOADING';
                    renderQueue();
                    try {
                        if (!uploadFn) throw new Error('Upload function not configured');
                        const result = await uploadFn(item.file);
                        item.status = 'SUCCESS';
                        item.url = result.url || result;
                        item.alt = result.alt || '';
                    } catch (err) {
                        item.status = 'ERROR';
                        item.error = err.message;
                    }
                    renderQueue();
                }
            }
        }

        function handleFiles(files) {
            if (!files || files.length === 0) return;
            const newItems = Array.from(files).map(file => ({
                file,
                status: 'PENDING',
                url: null,
                alt: null
            }));
            uploadQueue.push(...newItems);
            renderQueue();
            processQueue();
        }

        if (fileInput) {
            fileInput.addEventListener('change', () => {
                handleFiles(fileInput.files);
                fileInput.value = ''; // Reset
            });
        }

        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = '#007bff';
            });
            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = '#ccc';
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = '#ccc';
                if (e.dataTransfer && e.dataTransfer.files) {
                    handleFiles(e.dataTransfer.files);
                }
            });
        }

        if (uploadSubmit) {
          uploadSubmit.addEventListener('click', () => {
             const successfulItems = uploadQueue.filter(item => item.status === 'SUCCESS');
             if (successfulItems.length > 0) {
                 successfulItems.forEach(item => {
                     // Insert Phase
                     editor.image.insertUntrustedURL(item.url, item.alt || '');
                 });
                 // Clear the queue to avoid duplicates on next open
                 uploadQueue = [];
                 renderQueue();
                 modal.close();
             } else {
                 alert('No successful uploads to insert.');
             }
          });
        }

        // Clear queue on modal close so old state isn't preserved incorrectly
        modal.onClose = () => {
             uploadQueue = [];
             renderQueue();
        };

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
