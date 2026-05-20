// src/plugins/WordImportPlugin/ui/ImportModal.js
//
// User-facing dialog for importing a Word/RTF document. Walks the user
// through file selection, conversion options, and insertion mode, then
// orchestrates the converter + image uploader and finally hands the cleaned
// HTML to the editor.
//
// All user-visible strings are resolved through editor.i18n so the modal is
// fully bilingual (Persian / English) and respects RTL.

import { convertDocxToHtml } from '../conversion/docxConverter.js';
import { convertRtfToHtml } from '../conversion/rtfConverter.js';
import { convertHtmlToHtml } from '../conversion/htmlConverter.js';
import { convertTxtToHtml } from '../conversion/txtConverter.js';
import { cleanImportedHtml } from '../conversion/htmlCleaner.js';
import { uploadImagesInHtml } from '../conversion/imageUploader.js';
import { escapeHtml } from '../../../utils/html.js';

const MAX_FILE_MB = 25; // hard cap to prevent the browser from OOM-ing on huge docs

const ICONS = {
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  file:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  close:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  spinner:'<svg viewBox="0 0 50 50" width="18" height="18"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="80 200"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite"/></circle></svg>',
};

export class ImportModal {
  constructor(editor) {
    this.editor = editor;
    this.t = (k, p) => editor.i18n.t(k, p);

    this.selectedFile = null;
    this.mode = 'replace';       // 'replace' | 'append' | 'cursor'
    this.keepStyles = false;
    this.keepImages = true;
    this.busy = false;

    this.modal = null;
    this.bodyEl = null;
    this.importBtn = null;
    this.statusEl = null;
  }

  open() {
    // Snapshot the editor selection so "insert at cursor" still targets the
    // user's caret after they spend time in the modal.
    if (this.editor.selection && typeof this.editor.selection.save === 'function') {
      this.editor.selection.save();
    }

    this.modal = this.editor.ui.createModal({
      title: this.t('plugins.wordImport.modalTitle'),
      width: 'min(560px, 96vw)',
      submitText: this.t('plugins.wordImport.import'),
      cancelText: this.t('plugins.wordImport.cancel'),
      body: '',
      onSubmit: () => this._runImport(),
      onCancel: () => this._teardown(),
    });

    // Render our custom body into the modal.
    const body = this.modal.modalElement.querySelector('.penman-modal-body');
    if (body) {
      body.innerHTML = '';
      body.appendChild(this._buildBody());
      this.bodyEl = body;
    }
    this.modal.modalElement.classList.add('penman-wordimport-modal');

    // Wire up the footer "Import" button reference so we can disable it.
    this.importBtn = this.modal.modalElement.querySelector('.penman-modal-btn-submit');
    if (this.importBtn) {
      this.importBtn.disabled = true;
      this.importBtn.classList.add('penman-wordimport-import-btn');
    }
  }

  // ── Body ────────────────────────────────────────────────────────────────

  _buildBody() {
    const root = document.createElement('div');
    root.className = 'penman-wordimport';

    root.appendChild(this._buildDropZone());
    root.appendChild(this._buildSelectedFile());
    root.appendChild(this._buildModeSection());
    root.appendChild(this._buildOptionsSection());
    root.appendChild(this._buildStatusArea());

    return root;
  }

  _buildDropZone() {
    const zone = document.createElement('label');
    zone.className = 'penman-wordimport-drop';
    zone.setAttribute('tabindex', '0');
    zone.innerHTML = `
      <div class="penman-wordimport-drop-icon">${ICONS.upload}</div>
      <div class="penman-wordimport-drop-title">${escapeHtml(this.t('plugins.wordImport.dropZoneTitle'))}</div>
      <div class="penman-wordimport-drop-hint">${escapeHtml(this.t('plugins.wordImport.dropZoneHint', { maxMb: MAX_FILE_MB }))}</div>
      <button type="button" class="penman-btn penman-wordimport-browse">${escapeHtml(this.t('plugins.wordImport.browseFiles'))}</button>
    `;

    // Hidden file input — clicking the label opens it natively.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.rtf,.html,.htm,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/html,text/plain';
    input.className = 'penman-wordimport-file';
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) this._onFileChosen(input.files[0]);
    });
    zone.appendChild(input);

    // Drag-and-drop wiring
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover'].forEach((ev) => {
      zone.addEventListener(ev, (e) => { stop(e); zone.classList.add('is-dragover'); });
    });
    ['dragleave', 'dragend', 'drop'].forEach((ev) => {
      zone.addEventListener(ev, (e) => { stop(e); zone.classList.remove('is-dragover'); });
    });
    zone.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) this._onFileChosen(file);
    });

    // Browse button delegates to the hidden input. We stop propagation so the
    // surrounding <label>'s default "click → open file picker" doesn't double
    // fire alongside our manual .click() call.
    zone.querySelector('.penman-wordimport-browse').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.click();
    });

    this._dropZone = zone;
    this._fileInput = input;
    return zone;
  }

  _buildSelectedFile() {
    const wrap = document.createElement('div');
    wrap.className = 'penman-wordimport-selected';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="penman-wordimport-selected-icon">${ICONS.file}</div>
      <div class="penman-wordimport-selected-info">
        <div class="penman-wordimport-selected-name"></div>
        <div class="penman-wordimport-selected-size"></div>
      </div>
      <button type="button" class="penman-wordimport-selected-remove" aria-label="${escapeHtml(this.t('plugins.wordImport.removeFile'))}">${ICONS.close}</button>
    `;
    wrap.querySelector('.penman-wordimport-selected-remove').addEventListener('click', () => {
      this._clearFile();
    });
    this._selectedFileEl = wrap;
    return wrap;
  }

  _buildModeSection() {
    const wrap = document.createElement('fieldset');
    wrap.className = 'penman-wordimport-section';
    wrap.innerHTML = `<legend>${escapeHtml(this.t('plugins.wordImport.modeLabel'))}</legend>`;

    const modes = [
      { value: 'replace', labelKey: 'modeReplace', descKey: 'modeReplaceDesc' },
      { value: 'cursor',  labelKey: 'modeInsert',  descKey: 'modeInsertDesc' },
      { value: 'append',  labelKey: 'modeAppend',  descKey: 'modeAppendDesc' },
    ];

    for (const m of modes) {
      const id = `pm-wi-mode-${m.value}`;
      const row = document.createElement('label');
      row.className = 'penman-wordimport-radio';
      row.setAttribute('for', id);
      row.innerHTML = `
        <input type="radio" id="${id}" name="penman-wordimport-mode" value="${m.value}" ${m.value === this.mode ? 'checked' : ''}>
        <div class="penman-wordimport-radio-text">
          <div class="penman-wordimport-radio-title">${escapeHtml(this.t('plugins.wordImport.' + m.labelKey))}</div>
          <div class="penman-wordimport-radio-desc">${escapeHtml(this.t('plugins.wordImport.' + m.descKey))}</div>
        </div>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) this.mode = m.value;
      });
      wrap.appendChild(row);
    }
    return wrap;
  }

  _buildOptionsSection() {
    const wrap = document.createElement('fieldset');
    wrap.className = 'penman-wordimport-section';
    wrap.innerHTML = `<legend>${escapeHtml(this.t('plugins.wordImport.optionsLabel'))}</legend>`;

    wrap.appendChild(this._buildCheckbox('pm-wi-keep-styles', 'optKeepStyles', this.keepStyles, (v) => {
      this.keepStyles = v;
    }));
    wrap.appendChild(this._buildCheckbox('pm-wi-keep-images', 'optKeepImages', this.keepImages, (v) => {
      this.keepImages = v;
    }));

    return wrap;
  }

  _buildCheckbox(id, labelKey, checked, onChange) {
    const row = document.createElement('label');
    row.className = 'penman-wordimport-check';
    row.setAttribute('for', id);
    row.innerHTML = `
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <span>${escapeHtml(this.t('plugins.wordImport.' + labelKey))}</span>
    `;
    row.querySelector('input').addEventListener('change', (e) => onChange(e.target.checked));
    return row;
  }

  _buildStatusArea() {
    const wrap = document.createElement('div');
    wrap.className = 'penman-wordimport-status';
    wrap.setAttribute('aria-live', 'polite');
    this.statusEl = wrap;
    return wrap;
  }

  // ── File selection ──────────────────────────────────────────────────────

  _onFileChosen(file) {
    if (!file) return;

    // Validate extension/MIME (we trust extension more than MIME — Word's
    // type strings vary across OSes).
    const lower = (file.name || '').toLowerCase();
    if (!lower.endsWith('.docx') &&
        !lower.endsWith('.rtf') &&
        !lower.endsWith('.html') &&
        !lower.endsWith('.htm') &&
        !lower.endsWith('.txt')) {
      this._setError(this.t('plugins.wordImport.errorUnsupportedFormat'));
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      this._setError(this.t('plugins.wordImport.errorFileTooLarge', { maxMb: MAX_FILE_MB }));
      return;
    }

    this.selectedFile = file;
    this._renderSelectedFile();
    this._clearStatus();
    if (this.importBtn) this.importBtn.disabled = false;
  }

  _clearFile() {
    this.selectedFile = null;
    if (this._fileInput) this._fileInput.value = '';
    if (this._selectedFileEl) this._selectedFileEl.hidden = true;
    if (this._dropZone) this._dropZone.hidden = false;
    if (this.importBtn) this.importBtn.disabled = true;
    this._clearStatus();
  }

  _renderSelectedFile() {
    const el = this._selectedFileEl;
    if (!el || !this.selectedFile) return;
    el.querySelector('.penman-wordimport-selected-name').textContent = this.selectedFile.name;
    el.querySelector('.penman-wordimport-selected-size').textContent = formatBytes(this.selectedFile.size);
    el.hidden = false;
    if (this._dropZone) this._dropZone.hidden = true;
  }

  // ── Import execution ────────────────────────────────────────────────────

  async _runImport() {
    if (this.busy) return;
    if (!this.selectedFile) {
      this._setError(this.t('plugins.wordImport.noFileSelected'));
      return;
    }

    this.busy = true;
    this._setBusy(this.t('plugins.wordImport.importing'));
    if (this.importBtn) this.importBtn.disabled = true;

    try {
      const lower = this.selectedFile.name.toLowerCase();
      let convertResult;

      if (lower.endsWith('.docx')) {
        convertResult = await this._convertDocx(this.selectedFile);
      } else if (lower.endsWith('.rtf')) {
        convertResult = await this._convertRtf(this.selectedFile);
      } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        convertResult = await this._convertHtml(this.selectedFile);
      } else if (lower.endsWith('.txt')) {
        convertResult = await this._convertTxt(this.selectedFile);
      } else {
        throw new Error(this.t('plugins.wordImport.errorUnsupportedFormat'));
      }

      let { html, messages = [] } = convertResult;
      html = (html || '').trim();
      if (!html) {
        throw new Error(this.t('plugins.wordImport.errorEmptyDocument'));
      }

      // Upload images through the editor's standard upload pipeline.
      let uploadSummary = { uploaded: 0, failed: 0, total: 0 };
      if (this.keepImages) {
        const uploadFn = this.editor.options && this.editor.options.imageUploadFn;
        if (typeof uploadFn === 'function') {
          this._setBusy(this.t('plugins.wordImport.uploadingImages', { done: 0, total: 0 }));
          const res = await uploadImagesInHtml(html, uploadFn, (done, total) => {
            this._setBusy(this.t('plugins.wordImport.uploadingImages', { done, total }));
          });
          html = res.html;
          uploadSummary = res;
        }
      }

      // Clean / wrap the resulting HTML, then insert per the selected mode.
      // The cleaner needs the editor to look up the caption placeholder via
      // i18n so the wrapped <figcaption> matches what the ImagePlugin would
      // produce for an image inserted natively.
      const cleaned = cleanImportedHtml(html, { editor: this.editor });
      this._insertIntoEditor(cleaned);

      // Surface conversion warnings (mammoth often emits a handful per doc).
      if (messages.length > 0 || uploadSummary.failed > 0) {
        this._reportWarnings(messages, uploadSummary);
      }

      this._teardown();
      this.modal && this.modal.close();
    } catch (err) {
      const raw = (err && err.message) ? err.message : String(err);
      // Specialise the "mammoth failed to load" error so users get a
      // network-friendly message instead of the raw stack.
      if (/Failed to load Mammoth/i.test(raw)) {
        this._setError(this.t('plugins.wordImport.errorMammothLoad'));
      } else {
        this._setError(this.t('plugins.wordImport.errorConversionFailed', { message: raw }));
      }
      if (this.importBtn) this.importBtn.disabled = false;
    } finally {
      this.busy = false;
    }
  }

  async _convertDocx(file) {
    const buffer = await file.arrayBuffer();
    return convertDocxToHtml(buffer, {
      keepStyles: this.keepStyles,
      keepImages: this.keepImages,
    });
  }

  async _convertRtf(file) {
    const text = await file.text();
    return convertRtfToHtml(text);
  }

  async _convertHtml(file) {
    const text = await file.text();
    return convertHtmlToHtml(text);
  }

  async _convertTxt(file) {
    const text = await file.text();
    return convertTxtToHtml(text);
  }

  // ── Insertion modes ─────────────────────────────────────────────────────

  _insertIntoEditor(html) {
    const ed = this.editor;
    if (this.mode === 'replace') {
      ed.setContent(html);
      if (ed.history && typeof ed.history.pushImmediate === 'function') {
        ed.history.pushImmediate();
      }
      ed.emit && ed.emit('change', ed.getContent());
      return;
    }

    if (this.mode === 'append') {
      const existing = ed.getContent() || '';
      ed.setContent(existing + html);
      if (ed.history && typeof ed.history.pushImmediate === 'function') {
        ed.history.pushImmediate();
      }
      ed.emit && ed.emit('change', ed.getContent());
      return;
    }

    // Default: insert at the cursor (or end if no saved cursor).
    if (ed.selection && typeof ed.selection.restore === 'function') {
      ed.selection.restore();
    }
    ed.insertContent(html);
  }

  // ── Status helpers ──────────────────────────────────────────────────────

  _setBusy(text) {
    if (!this.statusEl) return;
    this.statusEl.className = 'penman-wordimport-status is-busy';
    this.statusEl.innerHTML = `<span class="penman-wordimport-spinner">${ICONS.spinner}</span><span>${escapeHtml(text)}</span>`;
  }

  _setError(text) {
    if (!this.statusEl) return;
    this.statusEl.className = 'penman-wordimport-status is-error';
    this.statusEl.textContent = text;
  }

  _clearStatus() {
    if (!this.statusEl) return;
    this.statusEl.className = 'penman-wordimport-status';
    this.statusEl.textContent = '';
  }

  _reportWarnings(messages, uploadSummary) {
    // Log non-fatal warnings to the console for debugging; we don't surface
    // them in the toolbar because they're usually noise for the end-user.
    // Image upload failures are noteworthy though — emit them to console.warn
    // and the editor's event bus so a host can pick them up if it wants.
    if (messages.length > 0) {
      // eslint-disable-next-line no-console
      console.info('[WordImport]', this.t('plugins.wordImport.warningsTitle'), messages);
    }
    if (uploadSummary.failed > 0) {
      const text = this.t('plugins.wordImport.errorImageUpload', {
        failed: uploadSummary.failed,
        total: uploadSummary.total,
      });
      // eslint-disable-next-line no-console
      console.warn('[WordImport]', text);
      if (this.editor.emit) {
        this.editor.emit('wordImport:warning', { type: 'imageUpload', text, summary: uploadSummary });
      }
    }
  }

  _teardown() {
    if (this.editor.selection && typeof this.editor.selection.clearSaved === 'function') {
      this.editor.selection.clearSaved();
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
