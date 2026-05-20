import { uniqueId } from '../utils/uniqueId.js';

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
      dir: 'ltr',
      ...options
    };

    this.editor = this.options.editor;
    this.overlay = null;
    this.modalElement = null;
    this._previousFocus = null;
    this._keydownHandler = null;
    this._titleId = uniqueId('penman-modal-title-');

    // Drag state, populated lazily when the user first grabs the header.
    this._drag = null;

    this._createDOM();
    this._bindEvents();
    this._injectStyles();
  }

  _createDOM() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'penman-modal-overlay';

    this.modalElement = document.createElement('div');
    this.modalElement.className = 'penman-modal';
    this.modalElement.setAttribute('dir', this.options.dir);
    // Accessibility: announce the modal as a labelled dialog.
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    this.modalElement.setAttribute('aria-labelledby', this._titleId);
    // Allow programmatic focus when the focused trigger element gets removed.
    this.modalElement.setAttribute('tabindex', '-1');

    const header = document.createElement('div');
    header.className = 'penman-modal-header';
    const titleText = this.options.title || (this.editor && this.editor.i18n ? this.editor.i18n.t('ui.dialog') : 'Dialog');
    const closeLabel = (this.editor && this.editor.i18n) ? this.editor.i18n.t('ui.close') : 'Close';
    header.innerHTML = `<h3 id="${this._titleId}">${titleText}</h3><button class="penman-modal-close" type="button" aria-label="${closeLabel}">&times;</button>`;

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
    // Styles are now fully managed in penman-ui.css — no inline injection needed.
    // This method is kept for backward compatibility but does nothing.
  }

  /**
   * Returns every focusable descendant of the modal in DOM order. Used by the
   * focus trap to compute the loop endpoints.
   */
  _getFocusableElements() {
    const selector = [
      'a[href]',
      'area[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'iframe',
      'object',
      'embed',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(this.modalElement.querySelectorAll(selector))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  /**
   * Keydown handler that implements the focus trap and Escape-to-close.
   */
  _handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof this.options.onCancel === 'function') {
        this.options.onCancel();
      }
      this.close();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusable = this._getFocusableElements();
    if (focusable.length === 0) {
      // Nothing focusable — keep focus on the dialog container itself.
      e.preventDefault();
      this.modalElement.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !this.modalElement.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  open() {
    // Remember whatever was focused so we can restore it on close.
    this._previousFocus = document.activeElement;

    document.body.appendChild(this.overlay);

    // Install the focus trap. Bound here so we can detach the same reference.
    // Use bubble phase (not capture) so other handlers on inner elements still
    // run first; the trap only intervenes for Tab navigation when no inner
    // handler stopped propagation.
    this._keydownHandler = (e) => this._handleKeydown(e);
    document.addEventListener('keydown', this._keydownHandler);

    // Make the dialog draggable by its header. We wire this after the modal
    // is in the DOM so getBoundingClientRect() reports real coordinates.
    this._makeDraggable();

    // Focus first input/control inside the modal. If nothing focusable exists,
    // focus the dialog container itself so the trap has somewhere to start.
    const focusable = this._getFocusableElements();
    const initialTarget = focusable[0] || this.modalElement;
    setTimeout(() => {
      try { initialTarget.focus(); } catch (_) { /* noop */ }
    }, 10);
  }

  /**
   * Make the modal draggable by its header. The dialog starts centered by the
   * overlay's flexbox layout; the first pointerdown on the header pins it to
   * its current visual rect with position:fixed, then subsequent moves update
   * left/top. Pointer Events are used so mouse, touch, and pen all work, and
   * pointer capture keeps the drag going if the cursor briefly leaves the
   * header.
   *
   * Paired with the global CSS rule `.penman-modal-overlay { pointer-events:
   * none; }`, this lets the user interact with whatever is underneath the
   * dialog while the dialog itself stays focused and interactive.
   */
  _makeDraggable() {
    const modalEl = this.modalElement;
    if (!modalEl) return;
    const header = modalEl.querySelector('.penman-modal-header');
    if (!header) return;

    const state = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originLeft: 0,
      originTop: 0,
      floating: false,
    };
    this._drag = state;

    const onPointerDown = (e) => {
      // Clicks on any control inside the header (the close button, etc.)
      // must reach their own handler — never start a drag from a button.
      if (e.target && e.target.closest && e.target.closest('button')) return;
      // Only primary button / first touch initiates a drag.
      if (e.button !== undefined && e.button !== 0) return;

      // Pin the modal at its current visual position the first time we drag.
      // Subsequent drags just update left/top.
      if (!state.floating) {
        const rect = modalEl.getBoundingClientRect();
        modalEl.style.position = 'fixed';
        modalEl.style.left = rect.left + 'px';
        modalEl.style.top = rect.top + 'px';
        modalEl.style.margin = '0';
        modalEl.style.transform = 'none';
        modalEl.classList.add('is-floating');
        state.floating = true;
      }

      const rect = modalEl.getBoundingClientRect();
      state.active = true;
      state.pointerId = e.pointerId;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.originLeft = rect.left;
      state.originTop = rect.top;

      modalEl.classList.add('is-dragging');
      try { header.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!state.active || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      let nextLeft = state.originLeft + dx;
      let nextTop  = state.originTop  + dy;

      // Clamp so the modal can't be dragged entirely off-screen. Keep at
      // least 60px of the header visible on the left/right and the header
      // strip itself visible at the top/bottom so the user can always grab
      // it again.
      const w = modalEl.offsetWidth;
      const minLeft = 8 - w + 60;
      const maxLeft = window.innerWidth - 60 - 8;
      const minTop  = 0;
      const maxTop  = window.innerHeight - 40 - 8;

      if (nextLeft < minLeft) nextLeft = minLeft;
      if (nextLeft > maxLeft) nextLeft = maxLeft;
      if (nextTop  < minTop)  nextTop  = minTop;
      if (nextTop  > maxTop)  nextTop  = maxTop;

      modalEl.style.left = nextLeft + 'px';
      modalEl.style.top  = nextTop  + 'px';
    };

    const endDrag = (e) => {
      if (!state.active) return;
      if (e && e.pointerId !== state.pointerId) return;
      state.active = false;
      state.pointerId = null;
      modalEl.classList.remove('is-dragging');
      try {
        if (e && e.pointerId !== undefined) header.releasePointerCapture(e.pointerId);
      } catch (_) { /* noop */ }
    };

    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
  }

  close() {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Restore focus to whatever opened the modal — but only if it still
    // exists in the document. Avoid stealing focus from a different element
    // that the user has since clicked.
    if (this._previousFocus && document.contains(this._previousFocus) &&
        typeof this._previousFocus.focus === 'function') {
      try { this._previousFocus.focus(); } catch (_) { /* noop */ }
    }
    this._previousFocus = null;
  }
}
