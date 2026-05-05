export class EmbedModal {
  constructor(editor) {
    this.editor = editor;
    this.open();
  }

  open() {
    // Cache the selection before opening the modal
    if (this.editor.selection && typeof this.editor.selection.save === 'function') {
      this.editor.selection.save();
    }

    const modal = this.editor.ui.createModal({
      title: this.editor.i18n.t('plugins.embed.title') || 'Insert Embed Code',
      width: '500px',
      body: `
        <div class="penman-modal-body">
          <label style="display:block; font-weight: 500; margin-bottom: 8px;">
            ${this.editor.i18n.t('plugins.embed.label') || 'Embed Code (HTML/Iframe)'}
          </label>
          <textarea id="penman-embed-code" class="penman-input" rows="6" style="width: 100%; font-family: monospace; direction: ltr;" placeholder="<iframe src='...'></iframe>"></textarea>
          
          <div id="penman-embed-error" style="color: #dc3545; font-size: 13px; display: none; margin-top: 10px;"></div>
        </div>
        <div class="penman-modal-footer">
          <button type="button" class="penman-btn" id="penman-embed-cancel">${this.editor.i18n.t('ui.cancel') || 'Cancel'}</button>
          <button type="button" class="penman-btn penman-btn-primary" id="penman-embed-submit">${this.editor.i18n.t('ui.insert') || 'Insert'}</button>
        </div>
      `
    });

    const el = modal.element || modal.modalElement;
    
    const codeInput = el.querySelector('#penman-embed-code');
    const errorDiv = el.querySelector('#penman-embed-error');
    const submitBtn = el.querySelector('#penman-embed-submit');
    const cancelBtn = el.querySelector('#penman-embed-cancel');

    cancelBtn.addEventListener('click', () => modal.close());

    submitBtn.addEventListener('click', () => {
      const code = codeInput.value.trim();
      
      if (!code) {
        errorDiv.textContent = this.editor.i18n.t('plugins.embed.emptyError') || 'Please enter embed code.';
        errorDiv.style.display = 'block';
        return;
      }

      // Simple validation: Ensure it looks like HTML, e.g., contains `<iframe` or `<embed`
      const isEmbed = /<(iframe|embed|script|blockquote|video|audio)/i.test(code);
      if (!isEmbed) {
        errorDiv.textContent = this.editor.i18n.t('plugins.embed.invalidError') || 'Code must contain an embeddable HTML tag (like iframe, embed).';
        errorDiv.style.display = 'block';
        return;
      }

      if (this.editor.selection && typeof this.editor.selection.restore === 'function') {
         this.editor.selection.restore();
      }
      
      this.editor.embed.insertNode(code);
      modal.close();
    });

    setTimeout(() => codeInput.focus(), 10);
  }
}
