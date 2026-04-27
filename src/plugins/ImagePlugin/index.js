import { GallerySystem } from './gallery/index.js';
import { insertImageFromURL, uploadImageCommand, pasteImageHandler, dropImageHandler } from './commands/index.js';
import { insertFigureAtResolvedPoint } from './core/selectionModel.js';
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
        <button type="button" class="penman-btn penman-btn-edit-image" title="Edit Image" style="padding: 4px; display:flex; align-items:center; color: #111827;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-del-image" title="Delete Image" style="padding: 4px; display:flex; align-items:center; color: #111827;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
        </button>
      </div>
    `;
    floatingUI.mount(html);

    // Event listeners for buttons
    floatingUI.element.querySelector('.penman-btn-edit-image').addEventListener('click', (e) => {
       e.preventDefault();
       if (editor.ui && editor.ui.registry && editor.ui.registry.buttons['image']) {
          editor.ui.registry.buttons['image'].onAction();
       }
    });

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
          editor.emit('change', editor.getContent());
          floatingUI.hide();
       }
    });
    
  }

  editor.on('nodeSelected', (node) => {
    if (node && node.tagName === 'FIGURE' && node.classList.contains('penman-image')) {
      if (!floatingUI) createFloatingUI();
      floatingUI.setAnchor(node);
      floatingUI.show();
    } else {
      if (floatingUI) floatingUI.hide();
    }
  });

  // End of Floating UI logic


  // 2. Setup Event Listeners
  root.addEventListener('keydown', (e) => {
    handleCaptionKeyDown(e, editor);

    // Backspace to select image handler
    if (e.key === 'Backspace') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (range.collapsed && range.startOffset === 0) {
                // Check if we are at the beginning of a paragraph that immediately follows a figure
                let currentBlock = range.startContainer;
                if (currentBlock.nodeType === Node.TEXT_NODE) {
                    currentBlock = currentBlock.parentNode;
                }
                
                // Get block level parent
                while (currentBlock && currentBlock !== root && currentBlock.tagName !== 'P' && currentBlock.tagName !== 'DIV') {
                    currentBlock = currentBlock.parentNode;
                }
                
                if (currentBlock && currentBlock.previousElementSibling && currentBlock.previousElementSibling.tagName === 'FIGURE' && currentBlock.previousElementSibling.classList.contains('penman-image')) {
                    e.preventDefault();
                    
                    // Select the figure using the core selection manager
                    const figure = currentBlock.previousElementSibling;
                    editor.selection.selectNode(figure);
                    return;
                }
            }
        }
    }
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
    const handled = pasteImageHandler(editor, e, uploadFn);
    if (handled) {
      e.stopImmediatePropagation();
      return;
    }
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
    _uploadQueue: [],
    gallery: gallerySystem,
    insertFromURL: (url, alt, width, height) => insertImageFromURL(editor, { url, alt, trustLevel: TrustLevel.TRUSTED, width, height }), // From API, it might be trusted? Spec says "trustLevel is explicitly defined at PluginManager registration time". Let's assume UNTRUSTED by default for manual API calls unless specified.
    insertUntrustedURL: (url, alt, width, height) => insertImageFromURL(editor, { url, alt, trustLevel: TrustLevel.UNTRUSTED, width, height }),
    upload: (files) => uploadImageCommand(editor, files, editor.options.imageUploadFn),
    setAlignment: (figure, alignment) => setFigureAlignment(figure, alignment, editor)
  };


  // Register Image Button in Toolbar
  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('image', {
      text: editor.i18n.t('plugins.image.title'),
      onAction: () => {
        if (editor.selection && typeof editor.selection.save === 'function') {
          editor.selection.save();
        }

        // Find selected image if floatingUI is active to pre-fill URL tab
        let defaultUrl = '';
        let defaultAlt = '';
        const selectedNode = editor.selection.getSelectedNode() || (floatingUI ? floatingUI.anchorNode : null);

        if (selectedNode && selectedNode.tagName === 'FIGURE' && selectedNode.classList.contains('penman-image')) {
            const img = selectedNode.querySelector('img');
            if (img) {
                defaultUrl = img.getAttribute('src') || '';
                defaultAlt = img.getAttribute('alt') || '';
            }
        }

        const modal = editor.ui.createModal({
          title: editor.i18n.t('plugins.image.title'),
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
              <div class="penman-image-tab active" data-tab="url">${editor.i18n.t('plugins.image.urlTab')}</div>
              <div class="penman-image-tab" data-tab="upload">${editor.i18n.t('plugins.image.uploadTab')}</div>
              <div class="penman-image-tab" data-tab="gallery">${editor.i18n.t('plugins.image.galleryTab')}</div>
            </div>

            <div class="penman-image-tab-content active" id="penman-tab-url">
              <div style="padding: 0 15px 15px">
                <div style="margin-bottom: 10px;">
                  <label style="display:block;margin-bottom:5px;">${editor.i18n.t('plugins.image.urlLabel')}</label>
                  <input type="text" id="penman-image-url-input" class="penman-input" placeholder="${editor.i18n.t('plugins.image.urlPlaceholder')}" dir="ltr" style="text-align: left; width: 100%; box-sizing: border-box;" value="${defaultUrl}" />
                </div>
                <div style="margin-bottom: 15px;">
                  <label style="display:block;margin-bottom:5px;">${editor.i18n.t('plugins.image.altLabel')}</label>
                  <input type="text" id="penman-image-alt-input" class="penman-input" placeholder="${editor.i18n.t('plugins.image.altPlaceholder')}" value="${defaultAlt}" style="width: 100%; box-sizing: border-box;" />
                </div>
              </div>
              <div class="penman-modal-footer">
                <button type="button" class="penman-btn penman-modal-close-btn" id="penman-image-url-cancel">${editor.i18n.t('ui.cancel')}</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-url-submit">${defaultUrl ? editor.i18n.t('ui.edit') : editor.i18n.t('ui.insert')}</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-upload">
              <div style="padding: 0 15px 15px">
                <div id="penman-image-dropzone" style="margin-bottom: 15px; border: 1.5px dashed #b0b0b0; padding: 25px 20px; text-align: center; border-radius: 6px; cursor: pointer;" onclick="document.getElementById('penman-image-file-input').click()">

                  <input type="file" id="penman-image-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;" multiple />
                  <p style="margin: 0; color: #001529; font-weight: 600; font-size: 14px;">${editor.i18n.t('plugins.image.uploadPlaceholder')}</p>
                </div>
                <div id="penman-image-upload-queue" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                </div>
              </div>

              <div class="penman-modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="penman-btn" id="penman-image-upload-remove" style="background-color: #fff0f0; color: #ff4d4f; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer;">${editor.i18n.t('plugins.image.clearQueue')}</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-upload-submit" style="background-color: #4285f4; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer;">${editor.i18n.t('plugins.image.insertSelected')}</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-gallery">
              <div style="padding: 0 15px 15px">
                <div class="penman-gallery-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto;">
                  <div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;" class="penman-gallery-empty">
                    <p>${editor.i18n.t('plugins.image.loading')}</p>
                  </div>
                </div>
              </div>
              <div class="penman-modal-footer">
                <button type="button" class="penman-btn penman-modal-close-btn" id="penman-image-gallery-cancel">${editor.i18n.t('ui.close')}</button>
              </div>
            </div>
          `
        });

        const elModal = modal.element || modal.modalElement;

        // Tab Switching Logic
        const tabs = elModal.querySelectorAll('.penman-image-tab');
        const contents = elModal.querySelectorAll('.penman-image-tab-content');

        
        function renderGalleryItems(items, galleryContainer, modal, editor, source, elModal, isAppending = false) {
            if (!isAppending) {
                galleryContainer.innerHTML = '';
            } else {
                const emptyState = galleryContainer.querySelector('.penman-gallery-empty');
                if (emptyState) emptyState.remove();
            }

            galleryContainer.dataset.loaded = 'true';
            
            items.forEach(item => {
                // Prevent duplicate rendering
                if (galleryContainer.querySelector(`[data-gallery-id="${item.id}"]`)) return;

                const imgDiv = document.createElement('div');
                imgDiv.dataset.galleryId = item.id;
                imgDiv.style.cursor = 'pointer';
                imgDiv.style.border = '2px solid transparent';
                imgDiv.style.borderRadius = '4px';
                imgDiv.style.overflow = 'hidden';
                imgDiv.style.height = '100px';
                imgDiv.style.position = 'relative';
                imgDiv.style.backgroundColor = '#f0f0f0';
                
                // Native Lazy Loading
                imgDiv.innerHTML = `<img src="${item.thumbnailUrl || item.url}" loading="lazy" style="width:100%; height:100%; object-fit:cover; transition: opacity 0.3s;" title="${item.title || ''}" onload="this.style.opacity=1" onerror="this.style.opacity=0">`;

                // Add "Copy Link" overlay
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                copyBtn.title = editor.i18n.t('plugins.image.copyLink');
                copyBtn.style.position = 'absolute';
                copyBtn.style.top = '4px';
                copyBtn.style.right = '4px';
                copyBtn.style.background = 'rgba(255, 255, 255, 0.9)';
                copyBtn.style.border = '1px solid #ccc';
                copyBtn.style.borderRadius = '4px';
                copyBtn.style.padding = '4px';
                copyBtn.style.cursor = 'pointer';
                copyBtn.style.opacity = '0';
                copyBtn.style.transition = 'opacity 0.2s';
                copyBtn.style.display = 'flex';
                copyBtn.style.alignItems = 'center';
                copyBtn.style.justifyContent = 'center';

                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent inserting image
                    navigator.clipboard.writeText(item.url).then(() => {
                        const originalHTML = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                        setTimeout(() => copyBtn.innerHTML = originalHTML, 2000);
                    });
                });

                imgDiv.appendChild(copyBtn);

                const img = imgDiv.querySelector('img');
                img.style.opacity = '0';
                img.onload = () => img.style.opacity = '1';
                
                imgDiv.addEventListener('mouseover', () => {
                    imgDiv.style.borderColor = '#007bff';
                    copyBtn.style.opacity = '1';
                });
                imgDiv.addEventListener('mouseout', () => {
                    imgDiv.style.borderColor = 'transparent';
                    copyBtn.style.opacity = '0';
                });
                
                imgDiv.addEventListener('click', () => {
                    editor.image.insertFromURL(item.url, item.title || '', item.width, item.height);
                    modal.close();
                });
                
                galleryContainer.appendChild(imgDiv);
            });

            // Handle Load More Button
            let loadMoreBtn = elModal.querySelector('.penman-gallery-load-more');
            if (!isAppending && loadMoreBtn) {
                loadMoreBtn.remove();
                loadMoreBtn = null;
            }
            if (source && source._nextCursor) {
                if (!loadMoreBtn) {
                    loadMoreBtn = document.createElement('button');
                    loadMoreBtn.className = 'penman-btn penman-gallery-load-more';
                    loadMoreBtn.textContent = editor.i18n.t('plugins.image.loadMore');
                    loadMoreBtn.style.gridColumn = '1 / -1';
                    loadMoreBtn.style.marginTop = '10px';
                    loadMoreBtn.style.padding = '8px';

                    loadMoreBtn.addEventListener('click', () => {
                        const originalText = loadMoreBtn.textContent;
                        loadMoreBtn.textContent = editor.i18n.t('plugins.image.loading');
                        loadMoreBtn.disabled = true;

                        source.list(source._nextCursor).then(res => {
                            if (res && res.items && res.items.length > 0) {
                                source._cachedItems = source._cachedItems.concat(res.items);
                                source._nextCursor = res.nextCursor || null;
                                renderGalleryItems(res.items, galleryContainer, modal, editor, source, elModal, true);
                            }
                            if (!source._nextCursor) {
                                loadMoreBtn.remove();
                            } else {
                                loadMoreBtn.textContent = originalText;
                                loadMoreBtn.disabled = false;
                                // Move button to the end
                                galleryContainer.appendChild(loadMoreBtn);
                            }
                        }).catch(err => {
                            loadMoreBtn.textContent = originalText;
                            loadMoreBtn.disabled = false;
                            console.error('Failed to load more items:', err);
                        });
                    });
                    galleryContainer.appendChild(loadMoreBtn);
                } else {
                    // Ensure it stays at the bottom
                    galleryContainer.appendChild(loadMoreBtn);
                }
            } else if (loadMoreBtn) {
                loadMoreBtn.remove();
            }
        }

        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            elModal.querySelector('#penman-tab-' + tab.dataset.tab).classList.add('active');
            
            // Gallery Loading Logic
            if (tab.dataset.tab === 'gallery') {
            const galleryContainer = elModal.querySelector('.penman-gallery-container');
            
            // Fix: Prevent re-fetching and re-rendering if already loaded
            if (galleryContainer.dataset.loaded === 'true') {
                // If it's loaded, we still want to re-render from cache in case a new upload was injected
                const sources = editor.image.gallery.getRegisteredSources();
                if (sources.length > 0) {
                   editor.image.gallery.getSource(sources[0].id).then(source => {
                       if (source._cachedItems) {
                           renderGalleryItems(source._cachedItems, galleryContainer, modal, editor, source, elModal, false);
                       }
                   }).catch(() => {});
                }
                return;
            }

            const sources = editor.image.gallery.getRegisteredSources();
            
            if (sources.length === 0) {
              galleryContainer.innerHTML = `<div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;"><p>${editor.i18n.t('plugins.image.noSources')}</p></div>`;
              galleryContainer.dataset.loaded = 'true';
              return;
            }

            // For simplicity in this base implementation, we load the first ready source
            const sourceInfo = sources[0];
            
            editor.image.gallery.getSource(sourceInfo.id).then(source => {
                // Fix: Check cache on the source object itself to persist across modal reopens
                if (source._cachedItems) {
                    galleryContainer.innerHTML = '';
                    renderGalleryItems(source._cachedItems, galleryContainer, modal, editor, source, elModal, false);
                    return;
                }

                source.list().then(res => {
                    if (res && res.items && res.items.length > 0) {
                        source._cachedItems = res.items;
                        source._nextCursor = res.nextCursor || null;
                        renderGalleryItems(res.items, galleryContainer, modal, editor, source, elModal, false);
                    } else {
                         galleryContainer.innerHTML = `<div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;"><p>${editor.i18n.t('plugins.image.galleryEmpty')}</p></div>`;
                         galleryContainer.dataset.loaded = 'true';
                    }
                }).catch(err => {
                    galleryContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px; grid-column: 1 / -1;"><p>${editor.i18n.t('plugins.image.galleryError').replace('{error}', err.message)}</p></div>`;
                });
            }).catch(err => {
                galleryContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px; grid-column: 1 / -1;"><p>${editor.i18n.t('plugins.image.errorInit').replace('{error}', err.message)}</p></div>`;
            });
          }
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
                // If we have an active selected image, update it instead of inserting a new one
                const activeNode = editor.selection.getSelectedNode() || (floatingUI ? floatingUI.anchorNode : null);
                if (defaultUrl && activeNode && activeNode.tagName === 'FIGURE' && activeNode.classList.contains('penman-image')) {
                    const img = activeNode.querySelector('img');
                    if (img) {
                        img.src = url;
                        if (alt) img.alt = alt;
                        else img.removeAttribute('alt');
                        
                        editor.history.pushImmediate();
                        editor.emit('change', editor.getContent());
                        modal.close();
                        return;
                    }
                }
                
                // Otherwise, insert new
                editor.selection.restore();
                editor.selection.save();
                editor.image.insertUntrustedURL(url, alt);
                modal.close();
              } catch (err) { alert(editor.i18n.t('plugins.image.invalidImageUrl').replace('{error}', err.message)); }
            }
          });
        }

        // Upload Queue State Phase
        const uploadSubmit = elModal.querySelector('#penman-image-upload-submit');
        const fileInput = elModal.querySelector('#penman-image-file-input');
        const dropzone = elModal.querySelector('#penman-image-dropzone');
        const queueContainer = elModal.querySelector('#penman-image-upload-queue');
        const uploadFn = editor.options.imageUploadFn;
        
        let uploadQueue = editor.image._uploadQueue;
        
        // Immediately render queue to restore state visually upon reopen
        setTimeout(() => {
            if (uploadQueue && uploadQueue.length > 0) {
                 renderQueue();
            }
        }, 0);
        
        function formatSize(bytes) {
            if (bytes === 0) return '0B';
            const k = 1024;
            const sizes = ['B', 'K', 'M', 'G'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
        }

        function formatType(type) {
            const ext = type.split('/')[1] || '';
            return ext.toUpperCase() || 'UNKNOWN';
        }

        function renderQueue() {
            queueContainer.innerHTML = '';
            uploadQueue.forEach(item => {
                const el = document.createElement('div');
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.padding = '12px 0';
                el.style.borderBottom = '1px solid #f0f0f0';
                
                // Thumbnail
                const thumbDiv = document.createElement('div');
                thumbDiv.style.width = '64px';
                thumbDiv.style.height = '64px';
                thumbDiv.style.borderRadius = '8px';
                thumbDiv.style.overflow = 'hidden';
                thumbDiv.style.marginRight = '16px';
                thumbDiv.style.flexShrink = '0';
                thumbDiv.style.backgroundColor = '#f5f5f5';
                
                if (item.thumbnailUrl) {
                    const img = document.createElement('img');
                    img.src = item.thumbnailUrl;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    thumbDiv.appendChild(img);
                }
                el.appendChild(thumbDiv);
                
                // Content
                const contentDiv = document.createElement('div');
                contentDiv.style.flex = '1';
                contentDiv.style.minWidth = '0';
                contentDiv.style.display = 'flex';
                contentDiv.style.flexDirection = 'column';
                contentDiv.style.justifyContent = 'center';
                
                const nameDiv = document.createElement('div');
                nameDiv.textContent = item.file.name.length > 25 ? item.file.name.substring(0, 22) + '...' : item.file.name;
                nameDiv.style.fontSize = '15px';
                nameDiv.style.fontWeight = '500';
                nameDiv.style.color = '#333';
                nameDiv.style.marginBottom = '6px';
                nameDiv.style.whiteSpace = 'nowrap';
                nameDiv.style.overflow = 'hidden';
                nameDiv.style.textOverflow = 'ellipsis';
                contentDiv.appendChild(nameDiv);
                
                // Status / Progress bar
                const statusDiv = document.createElement('div');
                statusDiv.style.display = 'flex';
                statusDiv.style.alignItems = 'center';
                statusDiv.style.marginBottom = '6px';
                
                if (item.status === 'SUCCESS') {
                    const successText = document.createElement('span');
                    successText.textContent = editor.i18n.t('plugins.image.success');
                    successText.style.color = '#28a745';
                    successText.style.fontSize = '12px';
                    successText.style.fontWeight = 'bold';
                    statusDiv.appendChild(successText);
                } else if (item.status === 'ERROR') {
                    const errText = document.createElement('span');
                    errText.textContent = `${editor.i18n.t('plugins.image.error')}: ` + (item.error || editor.i18n.t('plugins.image.failed'));
                    errText.style.color = '#dc3545';
                    errText.style.fontSize = '12px';
                    errText.style.fontWeight = 'bold';
                    statusDiv.appendChild(errText);
                    
                    const retryBtn = document.createElement('span');
                    retryBtn.textContent = editor.i18n.t('plugins.image.retry');
                    retryBtn.style.color = '#007bff';
                    retryBtn.style.fontSize = '12px';
                    retryBtn.style.cursor = 'pointer';
                    retryBtn.style.marginLeft = '10px';
                    retryBtn.onclick = () => {
                        item.status = 'PENDING';
                        item.progress = 0;
                        renderQueue();
                        processQueue();
                    };
                    statusDiv.appendChild(retryBtn);
                } else {
                    // Progress bar
                    const barContainer = document.createElement('div');
                    barContainer.style.flex = '1';
                    barContainer.style.height = '6px';
                    barContainer.style.backgroundColor = '#f0f0f0';
                    barContainer.style.borderRadius = '3px';
                    barContainer.style.overflow = 'hidden';
                    barContainer.style.marginRight = '12px';
                    
                    const bar = document.createElement('div');
                    bar.style.width = Math.min(item.progress, 100) + '%';
                    bar.style.height = '100%';
                    bar.style.backgroundColor = '#28a745';
                    bar.style.transition = 'width 0.2s linear';
                    barContainer.appendChild(bar);
                    
                    const pctText = document.createElement('span');
                    pctText.textContent = Math.floor(item.progress) + '%';
                    pctText.style.fontSize = '12px';
                    pctText.style.color = '#333';
                    pctText.style.fontWeight = '500';
                    
                    statusDiv.appendChild(barContainer);
                    statusDiv.appendChild(pctText);
                }
                
                contentDiv.appendChild(statusDiv);
                
                // Meta
                const metaDiv = document.createElement('div');
                metaDiv.style.fontSize = '12px';
                metaDiv.style.color = '#888';
                metaDiv.innerHTML = `${editor.i18n.t('plugins.image.format')}<span style="color:#333;font-weight:500;margin-right:8px;">${item.format}</span> ${editor.i18n.t('plugins.image.size')}<span style="color:#333;font-weight:500;">${item.size}</span>`;
                contentDiv.appendChild(metaDiv);
                
                el.appendChild(contentDiv);
                
                // Checkbox
                const checkContainer = document.createElement('div');
                checkContainer.style.marginLeft = '16px';
                checkContainer.style.display = 'flex';
                checkContainer.style.alignItems = 'center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.selected;
                checkbox.onchange = (e) => {
                    item.selected = e.target.checked;
                };
                
                checkContainer.appendChild(checkbox);
                el.appendChild(checkContainer);
                
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
                        
                        item.progress = 0;
                        renderQueue();

                        // Extract dimensions from local file before upload
                        const dimensions = await new Promise((resolve) => {
                            if (item.thumbnailUrl) {
                                const img = new Image();
                                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                                img.onerror = () => resolve({ width: null, height: null });
                                img.src = item.thumbnailUrl;
                            } else {
                                resolve({ width: null, height: null });
                            }
                        });

                        const result = await uploadFn(item.file, (loaded, total) => {
                             if (total) {
                                 item.progress = Math.max(0, Math.min(100, (loaded / total) * 100));
                                 renderQueue();
                             }
                        });
                        
                        item.progress = 100;
                        item.status = 'SUCCESS';
                        item.url = result.url || result;
                        item.alt = result.alt || '';
                        item.width = dimensions.width;
                        item.height = dimensions.height;
                        
                        // Push into gallery cache immediately
                        const sources = editor.image.gallery.getRegisteredSources();
                        if (sources && sources.length > 0) {
                             editor.image.gallery.getSource(sources[0].id).then(source => {
                                 if (source._cachedItems) {
                                     source._cachedItems.unshift({
                                         id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                         url: item.url,
                                         thumbnailUrl: item.url,
                                         filename: item.file.name,
                                         sourceId: sources[0].id,
                                         width: item.width,
                                         height: item.height
                                     });
                                     // Invalidate the 'loaded' dataset flag so the gallery forces a re-render from the updated cache
                                     const galleryContainer = elModal.querySelector('.penman-gallery-container');
                                     if (galleryContainer) galleryContainer.dataset.loaded = 'false';
                                 }
                             }).catch(() => {});
                        }
                        
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
            const newItems = Array.from(files).map(file => {
                let thumbnailUrl = null;
                if (file.type.startsWith('image/')) {
                    thumbnailUrl = URL.createObjectURL(file);
                }
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    thumbnailUrl,
                    status: 'PENDING', // PENDING, UPLOADING, SUCCESS, ERROR
                    progress: 0,
                    url: null,
                    alt: null,
                    selected: true, // Selected by default
                    format: formatType(file.type),
                    size: formatSize(file.size)
                };
            });
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

        const uploadRemoveBtn = elModal.querySelector('#penman-image-upload-remove');
        if (uploadRemoveBtn) {
            uploadRemoveBtn.addEventListener('click', () => {
                const remainingItems = uploadQueue.filter(item => !item.selected);
                uploadQueue.forEach(item => {
                    if (item.selected && item.thumbnailUrl) {
                        URL.revokeObjectURL(item.thumbnailUrl);
                    }
                });
                uploadQueue = remainingItems;
                renderQueue();
            });
        }

        if (uploadSubmit) {
          uploadSubmit.addEventListener('click', () => {
             const itemsToInsert = uploadQueue.filter(item => item.selected && item.status === 'SUCCESS');
             if (itemsToInsert.length > 0) {
                 itemsToInsert.forEach(item => {
                     // Insert Phase - Uploads from our own API should be trusted
                     editor.image.insertFromURL(item.url, item.alt || '', item.width, item.height);
                 });
                 // Remove inserted items from the queue
                 const remainingItems = uploadQueue.filter(item => !(item.selected && item.status === 'SUCCESS'));
                 uploadQueue.forEach(item => {
                     if (item.selected && item.status === 'SUCCESS' && item.thumbnailUrl) {
                         URL.revokeObjectURL(item.thumbnailUrl);
                     }
                 });
                 uploadQueue = remainingItems;
                 renderQueue();
                 modal.close();
             } else {
                 alert('No items to insert.');
             }
          });
        }

        // Clear queue on modal close so old state isn't preserved incorrectly
        modal.onClose = () => {
             // We no longer clear the queue on close, preserving state.
             editor.image._uploadQueue = uploadQueue;
        };

        // Cancel Buttons Logic
        const cancelIds = ['#penman-image-url-cancel', '#penman-image-gallery-cancel'];
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
