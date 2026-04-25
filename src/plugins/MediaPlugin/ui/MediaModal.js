/**
 * Media Modal UI
 */

export class MediaModal {
  constructor(editor, registry, existingData = null) {
    this.editor = editor;
    this.registry = registry;
    this.existingData = existingData;
  }

  open() {
    // Preserve selection to restore or replace target
    if (this.editor.selection && typeof this.editor.selection.save === 'function') {
      this.editor.selection.save();
    }
    
    const isEditMode = !!this.existingData;

    const modal = this.editor.ui.createModal({
      title: isEditMode ? 'Edit Media' : 'Insert Media',
      width: '650px',
      hideFooter: true,
      body: `
        <style>
          .penman-media-preview-area {
            border: 1px solid #ccc;
            border-radius: 4px;
            background: #f9f9f9;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 15px;
            position: relative;
            overflow: hidden;
          }
          .penman-media-preview-area:after {
            content: "";
            display: block;
            padding-top: 56.25%;
          }
          .penman-media-preview-area iframe,
          .penman-media-preview-area video {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
          }
          .penman-media-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            background: #e0e0e0;
            color: #333;
            margin-left: 10px;
            text-transform: capitalize;
          }
          .penman-media-tabs {
            display: flex;
            border-bottom: 1px solid #ccc;
            margin-bottom: 15px;
          }
          .penman-media-tab {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-weight: 500;
          }
          .penman-media-tab.active {
            border-bottom-color: #006ce6;
            color: #006ce6;
          }
          .penman-media-tab-content {
            display: none;
          }
          .penman-media-tab-content.active {
            display: block;
          }
        </style>
        
        <div class="penman-media-tabs" id="penman-media-tabs">
          <div class="penman-media-tab" data-tab="direct">Direct Link</div>
          <div class="penman-media-tab active" data-tab="embed">Embed / Services</div>
        </div>

        <div style="padding: 0 15px 15px 15px;">
          
          <!-- Direct Link Tab -->
          <div id="tab-direct" class="penman-media-tab-content">
            <div style="margin-bottom: 10px;">
              <label style="display:block; font-weight: 500;">Direct File URL (.mp4, .mp3, etc)</label>
              <input type="text" id="penman-media-direct-url" class="penman-input" placeholder="https://example.com/video.mp4" style="width: 100%; box-sizing: border-box;" />
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; margin-bottom: 4px;">Title (Optional)</label>
                <input type="text" id="penman-media-title" class="penman-input" placeholder="Media title" style="width: 100%; box-sizing: border-box;" />
              </div>
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; margin-bottom: 4px;">Poster Image URL (Optional)</label>
                <input type="text" id="penman-media-poster" class="penman-input" placeholder="https://..." style="width: 100%; box-sizing: border-box;" />
              </div>
            </div>

            <div style="display: flex; gap: 15px; margin-bottom: 10px;">
              <label style="font-size: 13px; display: inline-flex; align-items: center;">
                <input type="checkbox" id="penman-media-controls" checked style="margin-right: 5px;"> Show Controls
              </label>
              <label style="font-size: 13px; display: inline-flex; align-items: center;">
                <input type="checkbox" id="penman-media-autoplay" style="margin-right: 5px;"> Autoplay
              </label>
            </div>
          </div>

          <!-- Embed Tab -->
          <div id="tab-embed" class="penman-media-tab-content active">
            <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
              <label style="display:block; font-weight: 500;">Media URL</label>
              <div>
                <label style="font-size: 12px; display: inline-flex; align-items: center;">
                  <input type="checkbox" id="penman-media-autodetect" checked style="margin-right: 5px;"> Auto-detect Provider
                </label>
                <span id="penman-media-provider-badge" class="penman-media-badge" style="display: none;"></span>
              </div>
            </div>
            <input type="text" id="penman-media-url" class="penman-input" placeholder="https://youtube.com/watch?v=... or https://aparat.com/v/..." style="width: 100%; box-sizing: border-box; margin-bottom: 10px;" />
            
            <div style="margin-bottom: 10px;">
              <label style="display:block; font-size: 12px; margin-bottom: 4px;">Title (Optional)</label>
              <input type="text" id="penman-media-embed-title" class="penman-input" placeholder="Media title for iframe" style="width: 100%; box-sizing: border-box;" />
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; margin-bottom: 4px;">Aspect Ratio</label>
                <select id="penman-media-aspect" class="penman-input" style="width: 100%;">
                  <option value="16/9">16:9 (Widescreen)</option>
                  <option value="4/3">4:3 (Standard)</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; margin-bottom: 4px;">Type</label>
                <select id="penman-media-type" class="penman-input" style="width: 100%;" disabled>
                  <option value="auto">Auto-detect</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="embed">Embed</option>
                </select>
              </div>
            </div>
          </div>

          <div id="penman-media-error" style="color: #dc3545; font-size: 13px; display: none; margin-bottom: 10px;"></div>

          <label style="display:block; font-weight: 500; margin-top: 15px;">Live Preview</label>
          <div id="penman-media-preview" class="penman-media-preview-area">
            <span style="color: #888;">Enter a valid URL to preview</span>
          </div>

        </div>
        <div class="penman-modal-footer">
          <button type="button" class="penman-btn" id="penman-media-cancel">Cancel</button>
          <button type="button" class="penman-btn penman-btn-primary" id="penman-media-submit" disabled>${isEditMode ? 'Update' : 'Insert'}</button>
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

    // Initialize tabs states visually based on activeTab
    tabs.forEach(t => {
       if (t.getAttribute('data-tab') === activeTab) t.classList.add('active');
       else t.classList.remove('active');
    });
    tabContents.forEach(c => {
       if (c.id === `tab-${activeTab}`) c.classList.add('active');
       else c.classList.remove('active');
    });

    // Tab Switching Logic
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

    const updatePreview = () => {
      errorDiv.style.display = 'none';
      submitBtn.disabled = true;
      currentMediaData = null;
      badge.style.display = 'none';

      if (activeTab === 'embed') {
        const url = urlInput.value.trim();
        if (!url) {
          preview.innerHTML = '<span style="color: #888;">Enter a valid URL to preview</span>';
          return;
        }

        let finalData = null;

        if (autodetectCb.checked) {
          const data = this.registry.process(url);
          if (data && data.provider !== 'direct') {
            finalData = data;
            badge.textContent = data.provider;
            badge.style.display = 'inline-block';
          } else {
            preview.innerHTML = '<span style="color: #dc3545;">Invalid or unsupported URL</span>';
            errorDiv.textContent = 'This URL is not supported by any active embed provider.';
            errorDiv.style.display = 'block';
          }
        } else {
          const customData = this.registry.process(url); 
          if (customData && customData.provider === 'custom') {
            finalData = customData;
          } else {
            preview.innerHTML = '<span style="color: #dc3545;">Domain not whitelisted</span>';
            errorDiv.textContent = 'This URL domain is not whitelisted for custom embeds.';
            errorDiv.style.display = 'block';
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
        if (!url) {
          preview.innerHTML = '<span style="color: #888;">Enter a valid URL to preview</span>';
          return;
        }

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
             let html = `<video src="${data.embedUrl}" style="width: 100%; height: 100%;"`;
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
          preview.innerHTML = '<span style="color: #dc3545;">Invalid direct file URL</span>';
          errorDiv.textContent = 'The URL does not point to a supported audio/video format.';
          errorDiv.style.display = 'block';
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
           // Ensure the ID is preserved when updating
           currentMediaData.id = this.existingData.id;
           this.editor.media.updateNode(this.existingData.node, currentMediaData);
        } else {
           this.editor.media.insertNode(currentMediaData);
        }
        modal.close();
      }
    });

    // Pre-fill data if in edit mode
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
