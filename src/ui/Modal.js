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
        border: 1px solid #ccc;
        border-radius: 3px;
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
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }
      .penman-modal-form-row label {
        width: 120px;
        margin-right: 10px;
        white-space: nowrap;
      }
      .penman-modal-form-row input[type="text"],
      .penman-modal-form-row input[type="url"],
      .penman-modal-form-row select {
        flex: 1;
        padding: 6px;
        box-sizing: border-box;
      }
      .penman-modal-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 20px;
      }
      .penman-modal-checkbox-group label {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        white-space: nowrap;
        font-size: 14px;
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
