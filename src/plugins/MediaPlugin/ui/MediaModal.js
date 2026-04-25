/**
 * Media Modal UI
 */

export class MediaModal {
  constructor(editor, registry) {
    this.editor = editor;
    this.registry = registry;
  }

  open() {
    // Preserve selection to restore or replace target
    if (this.editor.selection && typeof this.editor.selection.save === 'function') {
      this.editor.selection.save();
    }

    const modal = this.editor.ui.createModal({
      title: 'Insert Media',
      width: '600px',
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
          .penman-media-preview-area iframe {
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
        </style>
        <div style="padding: 15px;">
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

          <div id="penman-media-error" style="color: #dc3545; font-size: 13px; display: none; margin-bottom: 10px;"></div>

          <label style="display:block; font-weight: 500; margin-top: 15px;">Live Preview</label>
          <div id="penman-media-preview" class="penman-media-preview-area">
            <span style="color: #888;">Enter a valid URL to preview</span>
          </div>

        </div>
        <div class="penman-modal-footer">
          <button type="button" class="penman-btn" id="penman-media-cancel">Cancel</button>
          <button type="button" class="penman-btn penman-btn-primary" id="penman-media-submit" disabled>Insert</button>
        </div>
      `
    });

    const el = modal.element || modal.modalElement;

    const urlInput = el.querySelector('#penman-media-url');
    const autodetectCb = el.querySelector('#penman-media-autodetect');
    const badge = el.querySelector('#penman-media-provider-badge');
    const preview = el.querySelector('#penman-media-preview');
    const aspectSelect = el.querySelector('#penman-media-aspect');
    const errorDiv = el.querySelector('#penman-media-error');
    const submitBtn = el.querySelector('#penman-media-submit');
    const cancelBtn = el.querySelector('#penman-media-cancel');

    let currentMediaData = null;

    const updatePreview = () => {
      const url = urlInput.value.trim();
      errorDiv.style.display = 'none';

      if (!url) {
        preview.innerHTML = '<span style="color: #888;">Enter a valid URL to preview</span>';
        badge.style.display = 'none';
        submitBtn.disabled = true;
        currentMediaData = null;
        return;
      }

      if (autodetectCb.checked) {
        const data = this.registry.process(url);
        if (data) {
          currentMediaData = { ...data, aspectRatio: aspectSelect.value };

          // Show Badge
          badge.textContent = data.provider;
          badge.style.display = 'inline-block';

          // Render Live Preview
          preview.innerHTML = `<iframe src="${data.embedUrl}" frameborder="0" allow="autoplay; fullscreen" loading="lazy"></iframe>`;

          submitBtn.disabled = false;
        } else {
          preview.innerHTML = '<span style="color: #dc3545;">Invalid or unsupported URL</span>';
          badge.style.display = 'none';
          errorDiv.textContent = 'This URL is not supported by any active media provider.';
          errorDiv.style.display = 'block';
          submitBtn.disabled = true;
          currentMediaData = null;
        }
      } else {
        // Without autodetect, we assume it's a direct iframe but run it through the registry anyway to ensure whitelist
        const customData = this.registry.process(url); // Custom provider acts as fallback
        if (customData) {
          currentMediaData = { ...customData, aspectRatio: aspectSelect.value };
          badge.style.display = 'none';
          preview.innerHTML = `<iframe src="${customData.embedUrl}" frameborder="0" allow="autoplay; fullscreen" loading="lazy"></iframe>`;
          submitBtn.disabled = false;
        } else {
          preview.innerHTML = '<span style="color: #dc3545;">Domain not whitelisted</span>';
          badge.style.display = 'none';
          errorDiv.textContent = 'This URL domain is not whitelisted for custom embeds.';
          errorDiv.style.display = 'block';
          submitBtn.disabled = true;
          currentMediaData = null;
        }
      }
    };

    urlInput.addEventListener('input', updatePreview);
    aspectSelect.addEventListener('change', () => {
      if (currentMediaData) {
        currentMediaData.aspectRatio = aspectSelect.value;
      }
    });

    cancelBtn.addEventListener('click', () => modal.close());

    submitBtn.addEventListener('click', () => {
      if (currentMediaData) {
        // First restore selection before manipulating the DOM via API
        if (this.editor.selection && typeof this.editor.selection.restore === 'function') {
           this.editor.selection.restore();
        }

        // Trigger core insertion API
        this.editor.media.insertNode(currentMediaData);
        modal.close();
      }
    });

    setTimeout(() => urlInput.focus(), 10);
  }
}
