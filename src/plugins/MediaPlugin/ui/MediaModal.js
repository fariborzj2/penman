/**
 * Media Modal UI
 *
 * Tab-based modal for inserting/editing media. Visual styling lives in
 * penman-ui.css under the "MediaPlugin — modal" section so dark mode
 * cascades through CSS variables.
 */

export class MediaModal {
  constructor(editor, registry, existingData = null) {
    this.editor = editor;
    this.registry = registry;
    this.existingData = existingData;
  }

  open() {
    if (this.editor.selection && typeof this.editor.selection.save === 'function') {
      this.editor.selection.save();
    }

    const i18n = this.editor.i18n;
    const isEditMode = !!this.existingData;

    const modal = this.editor.ui.createModal({
      title: isEditMode ? i18n.t('plugins.media.editTitle') : i18n.t('plugins.media.insertTitle'),
      width: '650px',
      hideFooter: true,
      body: `
        <div class="penman-media-tabs" id="penman-media-tabs">
          <div class="penman-media-tab" data-tab="direct">${i18n.t('plugins.media.directTab')}</div>
          <div class="penman-media-tab active" data-tab="embed">${i18n.t('plugins.media.embedTab')}</div>
        </div>

        <div class="penman-media-pane">

          <!-- Direct Link Tab -->
          <div id="tab-direct" class="penman-media-tab-content">
            <div class="penman-media-row">
              <label>${i18n.t('plugins.media.directUrlLabel')}</label>
              <input type="text" id="penman-media-direct-url" class="penman-input" placeholder="${i18n.t('plugins.media.directPlaceholder')}" dir="ltr" />
            </div>

            <div class="penman-media-row-flex">
              <div>
                <label>${i18n.t('plugins.media.titleOptionalLabel')}</label>
                <input type="text" id="penman-media-title" class="penman-input" placeholder="${i18n.t('plugins.media.mediaTitlePlaceholder')}" />
              </div>
              <div>
                <label>${i18n.t('plugins.media.posterOptionalLabel')}</label>
                <input type="text" id="penman-media-poster" class="penman-input" placeholder="${i18n.t('plugins.media.posterPlaceholder')}" dir="ltr" />
              </div>
            </div>

            <div class="penman-media-checkbox-row">
              <label class="penman-media-checkbox-label">
                <input type="checkbox" id="penman-media-controls" checked> ${i18n.t('plugins.media.showControls')}
              </label>
              <label class="penman-media-checkbox-label">
                <input type="checkbox" id="penman-media-autoplay"> ${i18n.t('plugins.media.autoplay')}
              </label>
            </div>
          </div>

          <!-- Embed Tab -->
          <div id="tab-embed" class="penman-media-tab-content active">
            <div class="penman-media-embed-header">
              <label>${i18n.t('plugins.media.mediaUrlLabel')}</label>
              <div class="penman-media-embed-options">
                <label class="penman-media-checkbox-label">
                  <input type="checkbox" id="penman-media-autodetect" checked> ${i18n.t('plugins.media.autoDetectProvider')}
                </label>
                <span id="penman-media-provider-badge" class="penman-media-badge" hidden></span>
              </div>
            </div>
            <input type="text" id="penman-media-url" class="penman-input" placeholder="${i18n.t('plugins.media.embedPlaceholder')}" dir="ltr" />

            <div class="penman-media-row">
              <label>${i18n.t('plugins.media.titleOptionalLabel')}</label>
              <input type="text" id="penman-media-embed-title" class="penman-input" placeholder="${i18n.t('plugins.media.embedTitlePlaceholder')}" />
            </div>

            <div class="penman-media-row-flex">
              <div>
                <label>${i18n.t('plugins.media.aspectRatio')}</label>
                <select id="penman-media-aspect" class="penman-input">
                  <option value="16/9">${i18n.t('plugins.media.aspect169')}</option>
                  <option value="4/3">${i18n.t('plugins.media.aspect43')}</option>
                </select>
              </div>
              <div>
                <label>${i18n.t('plugins.media.typeLabel')}</label>
                <select id="penman-media-type" class="penman-input" disabled>
                  <option value="auto">${i18n.t('plugins.media.typeAuto')}</option>
                  <option value="video">${i18n.t('plugins.media.typeVideo')}</option>
                  <option value="audio">${i18n.t('plugins.media.typeAudio')}</option>
                  <option value="embed">${i18n.t('plugins.media.typeEmbed')}</option>
                </select>
              </div>
            </div>
          </div>

          <div id="penman-media-error" class="penman-media-error" hidden></div>

          <label class="penman-media-preview-label">${i18n.t('plugins.media.livePreview')}</label>
          <div id="penman-media-preview" class="penman-media-preview-area">
            <span class="penman-media-preview-placeholder">${i18n.t('plugins.media.invalidUrlPreview')}</span>
          </div>

        </div>
        <div class="penman-modal-footer">
          <button type="button" class="penman-btn" id="penman-media-cancel">${i18n.t('plugins.media.cancel')}</button>
          <button type="button" class="penman-btn penman-btn-primary" id="penman-media-submit" disabled>${isEditMode ? i18n.t('plugins.media.update') : i18n.t('plugins.media.insert')}</button>
        </div>
      `
    });

    const el = modal.element || modal.modalElement;

    const tabs = el.querySelectorAll('.penman-media-tab');
    const tabContents = el.querySelectorAll('.penman-media-tab-content');

    // Embed elements
    const urlInput = el.querySelector('#penman-media-url');
    const embedTitleInput = el.querySelector('#penman-media-embed-title');
    const autodetectCb = el.querySelector('#penman-media-autodetect');
    const badge = el.querySelector('#penman-media-provider-badge');
    const aspectSelect = el.querySelector('#penman-media-aspect');

    // Direct elements
    const directUrlInput = el.querySelector('#penman-media-direct-url');
    const directTitleInput = el.querySelector('#penman-media-title');
    const directPosterInput = el.querySelector('#penman-media-poster');
    const directControlsCb = el.querySelector('#penman-media-controls');
    const directAutoplayCb = el.querySelector('#penman-media-autoplay');

    // Shared elements
    const preview = el.querySelector('#penman-media-preview');
    const errorDiv = el.querySelector('#penman-media-error');
    const submitBtn = el.querySelector('#penman-media-submit');
    const cancelBtn = el.querySelector('#penman-media-cancel');

    let currentMediaData = null;
    let activeTab = 'embed';

    if (isEditMode) {
      activeTab = this.existingData.provider === 'direct' ? 'direct' : 'embed';
    }

    tabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === activeTab);
    });
    tabContents.forEach(c => {
      c.classList.toggle('active', c.id === `tab-${activeTab}`);
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        activeTab = tab.getAttribute('data-tab');
        el.querySelector(`#tab-${activeTab}`).classList.add('active');

        updatePreview();
      });
    });

    // Use a small helper to render placeholders/errors into the preview area
    // using themed CSS classes (no inline color).
    const renderPreviewMessage = (key, kind) => {
      const klass = kind === 'error' ? 'penman-media-preview-error' : 'penman-media-preview-placeholder';
      preview.innerHTML = `<span class="${klass}">${i18n.t(key)}</span>`;
    };
    const showError = (msgKey) => {
      errorDiv.textContent = i18n.t(msgKey);
      errorDiv.hidden = false;
    };
    const hideError = () => { errorDiv.hidden = true; errorDiv.textContent = ''; };

    const updatePreview = () => {
      hideError();
      submitBtn.disabled = true;
      currentMediaData = null;
      badge.hidden = true;

      if (activeTab === 'embed') {
        const url = urlInput.value.trim();
        if (!url) { renderPreviewMessage('plugins.media.invalidUrlPreview'); return; }

        let finalData = null;

        if (autodetectCb.checked) {
          const data = this.registry.process(url);
          if (data && data.provider !== 'direct') {
            finalData = data;
            badge.textContent = data.provider;
            badge.hidden = false;
          } else {
            renderPreviewMessage('plugins.media.invalidEmbedUrl', 'error');
            showError('plugins.media.invalidEmbedUrlMsg');
          }
        } else {
          const customData = this.registry.process(url);
          if (customData && customData.provider === 'custom') {
            finalData = customData;
          } else {
            renderPreviewMessage('plugins.media.domainNotWhitelisted', 'error');
            showError('plugins.media.domainNotWhitelistedMsg');
          }
        }

        if (finalData) {
          currentMediaData = {
            ...finalData,
            aspectRatio: aspectSelect.value,
            title: embedTitleInput.value.trim()
          };

          let iframeHtml = `<iframe src="${finalData.embedUrl}" frameborder="0" allow="autoplay; fullscreen" loading="lazy"`;
          if (currentMediaData.title) {
            iframeHtml += ` title="${currentMediaData.title}"`;
          }
          iframeHtml += `></iframe>`;

          preview.innerHTML = iframeHtml;
          submitBtn.disabled = false;
        }
      } else if (activeTab === 'direct') {
        const url = directUrlInput.value.trim();
        if (!url) { renderPreviewMessage('plugins.media.invalidUrlPreview'); return; }

        const data = this.registry.process(url);
        if (data && data.provider === 'direct') {
          currentMediaData = {
            ...data,
            title: directTitleInput.value.trim(),
            poster: directPosterInput.value.trim(),
            controls: directControlsCb.checked,
            autoplay: directAutoplayCb.checked,
            aspectRatio: '16/9'
          };

          if (data.kind === 'video') {
            let html = `<video src="${data.embedUrl}"`;
            if (currentMediaData.controls) html += ' controls';
            if (currentMediaData.autoplay) html += ' autoplay muted';
            if (currentMediaData.poster) html += ` poster="${currentMediaData.poster}"`;
            html += '></video>';
            preview.innerHTML = html;
          } else {
            preview.innerHTML = `<audio src="${data.embedUrl}" controls style="width: 80%;"></audio>`;
          }
          submitBtn.disabled = false;
        } else {
          renderPreviewMessage('plugins.media.invalidDirectUrl', 'error');
          showError('plugins.media.invalidDirectUrlMsg');
        }
      }
    };

    urlInput.addEventListener('input', updatePreview);
    embedTitleInput.addEventListener('input', updatePreview);
    aspectSelect.addEventListener('change', updatePreview);
    autodetectCb.addEventListener('change', updatePreview);

    directUrlInput.addEventListener('input', updatePreview);
    directTitleInput.addEventListener('input', updatePreview);
    directPosterInput.addEventListener('input', updatePreview);
    directControlsCb.addEventListener('change', updatePreview);
    directAutoplayCb.addEventListener('change', updatePreview);

    cancelBtn.addEventListener('click', () => modal.close());

    submitBtn.addEventListener('click', () => {
      if (currentMediaData) {
        if (this.editor.selection && typeof this.editor.selection.restore === 'function') {
          this.editor.selection.restore();
        }

        if (isEditMode && this.existingData.node) {
          currentMediaData.id = this.existingData.id;
          this.editor.media.updateNode(this.existingData.node, currentMediaData);
        } else {
          this.editor.media.insertNode(currentMediaData);
        }
        modal.close();
      }
    });

    if (isEditMode) {
      if (this.existingData.provider === 'direct') {
        directUrlInput.value = this.existingData.src || '';
        directTitleInput.value = this.existingData.title || '';
        directPosterInput.value = this.existingData.poster || '';
        directControlsCb.checked = this.existingData.controls;
        directAutoplayCb.checked = this.existingData.autoplay;
      } else {
        urlInput.value = this.existingData.src || '';
        embedTitleInput.value = this.existingData.title || '';
        aspectSelect.value = this.existingData.aspectRatio || '16/9';
        autodetectCb.checked = this.existingData.provider !== 'custom';
      }
      updatePreview();
    }

    setTimeout(() => urlInput.focus(), 10);
  }
}
