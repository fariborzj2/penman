export class Modal {
  /**
   * @param {Object} options
   * @param {string} options.title - The title of the modal
   * @param {string} options.body - The HTML body content of the modal
   * @param {Function} options.onSubmit - Callback when the submit button is clicked. Receives form data.
   * @param {Function} [options.onCancel] - Callback when the modal is closed without submitting.
   * @param {string} [options.submitText='OK'] - Text for the submit button
   * @param {string} [options.cancelText='Cancel'] - Text for the cancel button
   * @param {boolean} [options.hideFooter=false] - Whether to hide the default footer
   * @param {Array} [options.buttons] - Custom buttons config [{text, id, classNames, onClick, align}]
   */
  constructor(options) {
    this.options = {
      submitText: 'OK',
      cancelText: 'Cancel',
      hideFooter: false,
      buttons: null,
      width: null,
      ...options
    };

    this.overlay = null;
    this.modalElement = null;

    this._createDOM();
    this._bindEvents();
    this._injectStyles();
  }

  _createDOM() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'penman-modal-overlay';

    this.modalElement = document.createElement('div');
    this.modalElement.className = 'penman-modal';

    const header = document.createElement('div');
    header.className = 'penman-modal-header';
    header.innerHTML = `<h3>${this.options.title || 'Dialog'}</h3><button class="penman-modal-close" type="button">&times;</button>`;

    const body = document.createElement('div');
    body.className = 'penman-modal-body';
    body.innerHTML = this.options.body || '';

    if (this.options.width) {
        this.modalElement.style.width = this.options.width;
        this.modalElement.style.maxWidth = '95vw';
    }

    this.modalElement.appendChild(header);
    this.modalElement.appendChild(body);

    if (!this.options.hideFooter) {
      const footer = document.createElement('div');
      footer.className = 'penman-modal-footer';

      if (this.options.buttons && Array.isArray(this.options.buttons)) {
         // Custom buttons setup
         const leftGroup = document.createElement('div');
         leftGroup.className = 'penman-modal-footer-left';
         const rightGroup = document.createElement('div');
         rightGroup.className = 'penman-modal-footer-right';

         this.options.buttons.forEach(btnConfig => {
             const btn = document.createElement('button');
             btn.type = 'button';
             btn.className = `penman-btn ${btnConfig.classNames || ''}`;
             if (btnConfig.id) btn.id = btnConfig.id;
             btn.innerText = btnConfig.text;
             if (btnConfig.disabled) btn.disabled = true;

             if (btnConfig.onClick) {
                 btn.addEventListener('click', (e) => {
                     e.preventDefault();
                     btnConfig.onClick(e, this);
                 });
             }

             if (btnConfig.align === 'left') {
                 leftGroup.appendChild(btn);
             } else {
                 rightGroup.appendChild(btn);
             }
         });

         footer.appendChild(rightGroup);
         footer.appendChild(leftGroup);
        
         // Modify footer to act as a split container if left group has items
         if (leftGroup.childNodes.length > 0) {
             footer.style.justifyContent = 'space-between';
         }

      } else {
          // Default buttons setup
          footer.innerHTML = `
            <button class="penman-btn penman-modal-btn-cancel" type="button">${this.options.cancelText}</button>
            <button class="penman-btn penman-modal-btn-submit penman-btn-primary" type="button">${this.options.submitText}</button>
          `;
      }

      this.modalElement.appendChild(footer);
    }

    this.overlay.appendChild(this.modalElement);
  }

  _bindEvents() {
    const closeBtn = this.modalElement.querySelector('.penman-modal-close');
    const cancelBtn = this.modalElement.querySelector('.penman-modal-btn-cancel');
    const submitBtn = this.modalElement.querySelector('.penman-modal-btn-submit');

    const closeHandler = (e) => {
      e.preventDefault();
      if (typeof this.options.onCancel === 'function') {
        this.options.onCancel();
      }
      this.close();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.addEventListener('click', closeHandler);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        if (typeof this.options.onCancel === 'function') {
          this.options.onCancel();
        }
        this.close();
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Collect input data from modal body
        const inputs = this.modalElement.querySelectorAll('input, select, textarea');
        const data = {};
        inputs.forEach(input => {
          if (input.name) {
            data[input.name] = input.value;
          }
        });

        if (typeof this.options.onSubmit === 'function') {
          this.options.onSubmit(data);
        }
        this.close();
      });
    }
  }

  _injectStyles() {
    // Only inject once globally to avoid duplication
    if (document.getElementById('penman-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'penman-modal-styles';
    style.innerHTML = `
      .penman-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .penman-modal {
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        width: 400px;
        max-width: 90vw;
        display: flex;
        flex-direction: column;
      }
      .penman-modal-header {
        padding: 10px 15px;
        border-bottom: 1px solid #E2E8F0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .penman-modal-header h3 {
        margin: 0;
        font-size: 16px;
      }
      .penman-modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
      }
      .penman-modal-body input {
        width: auto;
        box-sizing: border-box;
        padding: 8px;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        margin-top: 5px;
      }
      .penman-modal-footer {
        padding: 10px 15px;
        border-top: 1px solid #E2E8F0;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
      }
      .penman-modal-footer .penman-btn {
        padding: 6px 12px;
        border: 1px solid #ccc;
        background: #fff;
        cursor: pointer;
        border-radius: 3px;
      }
      .penman-modal-footer .penman-btn-primary {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }
      .penman-modal-footer-left, .penman-modal-footer-right {
        display: flex;
        gap: 8px;
      }

      /* Generalized structural layout classes for forms inside Modals */
      .penman-modal-form-row {
        position: relative;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
      }
      .penman-modal-form-row label {
        position: absolute;
        top: 14px;
        left: 12px;
        font-size: 14px;
        color: #64748B;
        pointer-events: none;
        transition: all 0.2s ease-out;
        transform-origin: left top;
      }
      .penman-wrapper[dir="rtl"] .penman-modal-form-row label {
        left: auto;
        right: 12px;
        transform-origin: right top;
      }
      .penman-modal-form-row input[type="text"],
      .penman-modal-form-row input[type="url"],
      .penman-modal-form-row select {
        width: 100%;
        padding: 20px 12px 6px 12px;
        box-sizing: border-box;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        background-color: #fff;
        transition: border-color 0.2s, box-shadow 0.2s;
        outline: none;
      }

      .penman-modal-form-row input[type="text"]:focus,
      .penman-modal-form-row input[type="url"]:focus,
      .penman-modal-form-row select:focus {
        border-color: #3B82F6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      /* Floating label states */
      .penman-modal-form-row input:focus ~ label,
      .penman-modal-form-row input:not(:placeholder-shown) ~ label,
      .penman-modal-form-row select ~ label,
      .penman-modal-form-row.has-value label {
        top: 4px;
        font-size: 11px;
        color: #3B82F6;
      }
      .penman-modal-form-row input:not(:focus):not(:placeholder-shown) ~ label,
      .penman-modal-form-row select:not(:focus) ~ label {
        color: #64748B;
      }

      .penman-modal-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 20px;
      }
      .penman-modal-checkbox-group label,
      .penman-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #334155;
        white-space: nowrap;
      }

      /* Toggle Switch */
      .penman-modal-checkbox-group input[type="checkbox"],
      .penman-checkbox-label input[type="checkbox"],
      input[type="checkbox"].penman-toggle {
        appearance: none;
        -webkit-appearance: none;
        width: 36px;
        height: 20px;
        background-color: #CBD5E1;
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        outline: none;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
        margin: 0;
      }
      .penman-modal-checkbox-group input[type="checkbox"]::after,
      .penman-checkbox-label input[type="checkbox"]::after,
      input[type="checkbox"].penman-toggle::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background-color: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      .penman-modal-checkbox-group input[type="checkbox"]:checked,
      .penman-checkbox-label input[type="checkbox"]:checked,
      input[type="checkbox"].penman-toggle:checked {
        background-color: #3B82F6;
      }
      .penman-modal-checkbox-group input[type="checkbox"]:checked::after,
      .penman-checkbox-label input[type="checkbox"]:checked::after,
      input[type="checkbox"].penman-toggle:checked::after {
        transform: translateX(16px);
      }
      .penman-wrapper[dir="rtl"] .penman-modal-checkbox-group input[type="checkbox"]::after,
      .penman-wrapper[dir="rtl"] .penman-checkbox-label input[type="checkbox"]::after,
      .penman-wrapper[dir="rtl"] input[type="checkbox"].penman-toggle::after {
        left: auto;
        right: 2px;
      }
      .penman-wrapper[dir="rtl"] .penman-modal-checkbox-group input[type="checkbox"]:checked::after,
      .penman-wrapper[dir="rtl"] .penman-checkbox-label input[type="checkbox"]:checked::after,
      .penman-wrapper[dir="rtl"] input[type="checkbox"].penman-toggle:checked::after {
        transform: translateX(-16px);
      }

      .penman-modal-checkbox-group input[type="checkbox"]:focus-visible,
      .penman-checkbox-label input[type="checkbox"]:focus-visible,
      input[type="checkbox"].penman-toggle:focus-visible {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }

      /* Radio Buttons */
      .penman-modal-radio-group {
        display: flex;
        gap: 15px;
      }
      .penman-radio-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #334155;
      }
      .penman-radio-label input[type="radio"] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border: 2px solid #CBD5E1;
        border-radius: 50%;
        margin: 0;
        outline: none;
        position: relative;
        transition: border-color 0.2s ease;
      }
      .penman-radio-label input[type="radio"]::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #3B82F6;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .penman-radio-label input[type="radio"]:checked {
        border-color: #3B82F6;
      }
      .penman-radio-label input[type="radio"]:checked::after {
        transform: translate(-50%, -50%) scale(1);
      }
      .penman-radio-label input[type="radio"]:focus-visible {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  open() {
    document.body.appendChild(this.overlay);

    // Focus first input if available
    const firstInput = this.modalElement.querySelector('input, select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 10);
    }
  }

  close() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
