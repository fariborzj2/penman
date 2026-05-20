import { GallerySystem } from './gallery/index.js';
import { insertImageFromURL, uploadImageCommand, pasteImageHandler, dropImageHandler } from './commands/index.js';
import { insertFigureAtResolvedPoint } from './core/selectionModel.js';
import { handleCaptionKeyDown, handleCaptionPaste, handleCaptionBlur, setupAlignmentObserver, setFigureAlignment } from './rendering/index.js';
import { TrustLevel } from './security/index.js';
import { FloatingUI } from '../../ui/FloatingUI.js';
import { uniqueId } from '../../utils/uniqueId.js';
import { logger } from '../../utils/logger.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';
import './image.css';

/**
 * Translates internal gallery/upload error codes — and browser-native network
 * error messages — to i18n strings.
 *
 * Browser network errors are NOT standardised: different browsers produce
 * different message strings for the same underlying failure.  We detect them
 * with a set of case-insensitive patterns and map them all to a single
 * translated key so the user always sees a localised message.
 */
function translateError(editor, err) {
  const raw = err && err.message ? err.message : String(err);

  // ── 1. Exact-match map for our own internal error codes ──────────────────
  const codeMap = {
    'GALLERY_ERROR_NO_ID':        'plugins.image.gallery.errorNoId',
    'GALLERY_ERROR_NO_LIST':      'plugins.image.gallery.errorNoList',
    'GALLERY_ERROR_NO_GET':       'plugins.image.gallery.errorNoGet',
    'GALLERY_AUTH_FAILED':        'plugins.image.gallery.authFailed',
    'GALLERY_NOT_READY':          'plugins.image.gallery.notReady',
    'GALLERY_INVALID_FORMAT':     'plugins.image.gallery.invalidFormat',
    'GALLERY_ALREADY_REGISTERED': 'plugins.image.gallery.alreadyRegistered',
    'GALLERY_NOT_FOUND':          'plugins.image.gallery.notFound',
    'INVALID_TYPE':               'plugins.image.gallery.invalidType',
    'FILE_TOO_LARGE':             'plugins.image.gallery.fileTooLarge',
  };

  const exactKey = codeMap[raw];
  if (exactKey) {
    const translated = editor.i18n.t(exactKey);
    if (translated !== exactKey) return translated;
  }

  // ── 2. Pattern-match map for browser-native / OS-level error messages ────
  //
  // Each entry is [regex, i18nKey].  Patterns are tested in order; the first
  // match wins.  All patterns are case-insensitive.
  const patternMap = [
    // Network / fetch failures (Firefox, Chrome, Safari all differ)
    [/networkerror|failed to fetch|network request failed|load failed|the internet connection appears to be offline|could not connect|err_internet_disconnected|err_network_changed|err_name_not_resolved|err_connection_refused|err_connection_timed_out/i,
      'plugins.image.errors.networkError'],

    // HTTP 4xx / 5xx surfaced as text
    [/\b(40[0-9]|41[0-8]|422|429|4[3-9][0-9])\b/,
      'plugins.image.errors.httpClientError'],
    [/\b(5[0-9]{2})\b/,
      'plugins.image.errors.httpServerError'],

    // CORS
    [/cors|cross.?origin|access.?control/i,
      'plugins.image.errors.corsError'],

    // Timeout
    [/timeout|timed.?out|request timed/i,
      'plugins.image.errors.timeout'],

    // Abort
    [/abort|aborted|the operation was aborted/i,
      'plugins.image.errors.aborted'],

    // JSON / parse errors
    [/json|parse error|unexpected token|invalid json/i,
      'plugins.image.errors.parseError'],

    // Auth
    [/unauthorized|403|forbidden|authentication/i,
      'plugins.image.errors.unauthorized'],
  ];

  for (const [pattern, i18nKey] of patternMap) {
    if (pattern.test(raw)) {
      const translated = editor.i18n.t(i18nKey);
      if (translated !== i18nKey) return translated;
    }
  }

  // ── 3. Fallback: return the raw message as-is ────────────────────────────
  return raw;
}

export function setupImagePlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.image', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  const root = editor.editableArea;

  // 1. Setup DOM Observers
  const alignmentObserver = setupAlignmentObserver(root);

  // Floating UI for Images
  let floatingUI = null;

  // Register teardown hook so destroying the editor releases this plugin's
  // observers, floating UI, and modal state.
  editor.on('destroy', () => {
    if (alignmentObserver && typeof alignmentObserver.disconnect === 'function') {
      alignmentObserver.disconnect();
    }
    if (floatingUI && typeof floatingUI.destroy === 'function') {
      floatingUI.destroy();
      floatingUI = null;
    }
  });
  function createFloatingUI() {
    floatingUI = new FloatingUI(editor, { offset: 10, placement: 'top' });
    // All labels go through i18n; tooltips through the shared Tooltip service
    // (data-tooltip), so the floating toolbar visually matches the main toolbar
    // and is properly announced to screen readers.
    const labels = {
      alignLeft:   editor.i18n.t('plugins.image.alignLeft'),
      alignCenter: editor.i18n.t('plugins.image.alignCenter'),
      alignRight:  editor.i18n.t('plugins.image.alignRight'),
      editImage:   editor.i18n.t('plugins.image.editImage'),
      deleteImage: editor.i18n.t('plugins.image.deleteImage'),
    };
    const html = `
      <div class="penman-image-toolbar penman-floating-toolbar">
        <div class="penman-floating-tail-inner"></div>
        <div class="penman-floating-tail-outer"></div>

        <button type="button" class="penman-btn penman-btn-align-left"
                aria-label="${labels.alignLeft}" data-tooltip="${labels.alignLeft}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-align-center"
                aria-label="${labels.alignCenter}" data-tooltip="${labels.alignCenter}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-align-right"
                aria-label="${labels.alignRight}" data-tooltip="${labels.alignRight}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-edit-image"
                aria-label="${labels.editImage}" data-tooltip="${labels.editImage}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-del-image"
                aria-label="${labels.deleteImage}" data-tooltip="${labels.deleteImage}">
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
       if (!floatingUI.anchorNode) return;
       // Confirm before destructive removal — image delete is a single click
       // away and undo is not always obvious to new users.
       const target = floatingUI.anchorNode;
       editor.ui.createFormModal({
         title: editor.i18n.t('plugins.image.deleteImage'),
         fields: [
           { type: 'html', html: `<p>${editor.i18n.t('plugins.image.confirmDeleteImage')}</p>` }
         ],
         submitText: editor.i18n.t('ui.delete'),
         cancelText: editor.i18n.t('ui.cancel'),
         onSubmit: () => {
           if (!target.parentNode) return;
           editor.history.pushImmediate();
           target.remove();
           editor.emit('change', editor.getContent());
           if (floatingUI) floatingUI.hide();
         }
       });
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
            <div class="penman-image-tabs">
              <div class="penman-image-tab active" data-tab="url">${editor.i18n.t('plugins.image.urlTab')}</div>
              <div class="penman-image-tab" data-tab="upload">${editor.i18n.t('plugins.image.uploadTab')}</div>
              <div class="penman-image-tab" data-tab="gallery">${editor.i18n.t('plugins.image.galleryTab')}</div>
            </div>

            <div class="penman-image-tab-content active" id="penman-tab-url">
              <div class="penman-image-tab-pane">
                <div class="penman-image-field">
                  <label>${editor.i18n.t('plugins.image.urlLabel')}</label>
                  <input type="text" id="penman-image-url-input" class="penman-input" placeholder="${editor.i18n.t('plugins.image.urlPlaceholder')}" dir="ltr" value="${defaultUrl}" />
                </div>
                <div class="penman-image-field penman-image-field-last">
                  <label>${editor.i18n.t('plugins.image.altLabel')}</label>
                  <input type="text" id="penman-image-alt-input" class="penman-input" placeholder="${editor.i18n.t('plugins.image.altPlaceholder')}" value="${defaultAlt}" />
                </div>
              </div>
              <div class="penman-modal-footer">
                <button type="button" class="penman-btn penman-modal-close-btn" id="penman-image-url-cancel">${editor.i18n.t('ui.cancel')}</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-url-submit">${defaultUrl ? editor.i18n.t('ui.edit') : editor.i18n.t('ui.insert')}</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-upload">
              <div class="penman-image-tab-pane">
                <div id="penman-image-dropzone" class="penman-image-dropzone" onclick="document.getElementById('penman-image-file-input').click()">
                  <input type="file" id="penman-image-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;" multiple />
                  <p>${editor.i18n.t('plugins.image.uploadPlaceholder')}</p>
                </div>
                <div id="penman-image-upload-queue" class="penman-image-upload-queue"></div>
              </div>

              <div class="penman-modal-footer penman-image-modal-footer-flex">
                <button type="button" class="penman-btn penman-image-btn-clear" id="penman-image-upload-remove">${editor.i18n.t('plugins.image.clearQueue')}</button>
                <button type="button" class="penman-btn penman-btn-primary" id="penman-image-upload-submit">${editor.i18n.t('plugins.image.insertSelected')}</button>
              </div>
            </div>

            <div class="penman-image-tab-content" id="penman-tab-gallery">
              <div class="penman-image-tab-pane">
                <div class="penman-gallery-container penman-image-gallery">
                  <div class="penman-gallery-empty penman-image-gallery-empty">
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
                
                // Native Lazy Loading — built via DOM API so untrusted gallery
                // payload values (title/url) cannot inject attributes or scripts.
                const galleryImg = document.createElement('img');
                galleryImg.src = item.thumbnailUrl || item.url || '';
                galleryImg.loading = 'lazy';
                galleryImg.style.cssText = 'width:100%; height:100%; object-fit:cover; transition: opacity 0.3s;';
                if (item.title) galleryImg.title = String(item.title);
                galleryImg.addEventListener('load', () => { galleryImg.style.opacity = '1'; });
                galleryImg.addEventListener('error', () => { galleryImg.style.opacity = '0'; });
                imgDiv.appendChild(galleryImg);

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

                // Initialise opacity for the fade-in transition. Listener
                // already attached above when the image was created.
                galleryImg.style.opacity = '0';
                
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
                            logger.error('Failed to load more items:', err);
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
                    galleryContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px; grid-column: 1 / -1;"><p>${editor.i18n.t('plugins.image.galleryError').replace('{error}', translateError(editor, err))}</p></div>`;
                });
            }).catch(err => {
                galleryContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px; grid-column: 1 / -1;"><p>${editor.i18n.t('plugins.image.errorInit').replace('{error}', translateError(editor, err))}</p></div>`;
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
              } catch (err) {
                editor.ui.createFormModal({
                  title: editor.i18n.t('ui.error'),
                  fields: [
                    { type: 'html', html: `<p>${editor.i18n.t('plugins.image.invalidImageUrl').replace('{error}', translateError(editor, err))}</p>` }
                  ],
                  submitText: editor.i18n.t('ui.ok'),
                  onSubmit: () => {}
                });
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
                                         id: uniqueId(Date.now().toString() + '-'),
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
                    id: uniqueId(),
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
                 editor.ui.createFormModal({
                   title: editor.i18n.t('ui.info'),
                   fields: [
                     { type: 'html', html: `<p>${editor.i18n.t('plugins.image.noItemsToInsert')}</p>` }
                   ],
                   submitText: editor.i18n.t('ui.ok'),
                   onSubmit: () => {}
                 });
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
