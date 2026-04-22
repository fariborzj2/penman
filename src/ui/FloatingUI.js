export class FloatingUI {
  constructor(editor, options = {}) {
    this.editor = editor;
    this.options = Object.assign({
      offset: 8, // margin from the anchor
      placement: 'bottom', // 'top' or 'bottom'
      className: ''
    }, options);

    this.element = null;
    this.anchorNode = null;
    this.anchorRange = null;
    this.isVisible = false;

    // Bind methods
    this._handleScrollOrResize = this._handleScrollOrResize.bind(this);
  }

  /**
   * Mounts the Floating UI element into the DOM
   */
  mount(contentHtml) {
    if (this.element) {
      this.destroy();
    }

    this.element = document.createElement('div');
    this.element.className = `penman-floating-ui ${this.options.className}`.trim();
    this.element.style.position = 'absolute';
    this.element.style.display = 'none'; // Hidden initially
    this.element.style.zIndex = '1000';
    this.element.innerHTML = contentHtml;

    // Append to the editor's main container to keep styling scoped
    // and correctly contain overflow within the component's boundaries.
    this.editor.container.appendChild(this.element);

    // Listen to resize/scroll to update position
    window.addEventListener('resize', this._handleScrollOrResize);
    window.addEventListener('scroll', this._handleScrollOrResize, true); // true for capturing all scrolls

    this.isVisible = true;
  }

  /**
   * Sets the anchor for the floating UI and updates its position.
   * @param {Node|Range} anchor
   */
  setAnchor(anchor) {
    if (anchor instanceof Range) {
      this.anchorRange = anchor;
      this.anchorNode = null;
    } else if (anchor instanceof Node) {
      this.anchorNode = anchor;
      this.anchorRange = null;
    }
    this.update();
  }

  /**
   * Updates the position of the floating UI based on its anchor.
   */
  update() {
    if (!this.isVisible || !this.element || (!this.anchorNode && !this.anchorRange)) return;

    this.element.style.display = 'block';

    let rect;
    if (this.anchorNode) {
        if (this.anchorNode.nodeType === Node.ELEMENT_NODE) {
            rect = this.anchorNode.getBoundingClientRect();
        } else {
            // Text node fallback
            const range = document.createRange();
            range.selectNodeContents(this.anchorNode);
            rect = range.getBoundingClientRect();
        }
    } else if (this.anchorRange) {
        rect = this.anchorRange.getBoundingClientRect();
    }

    if (!rect || (rect.width === 0 && rect.height === 0)) {
        this.element.style.display = 'none';
        return;
    }

    const floatingRect = this.element.getBoundingClientRect();

    const containerRect = this.editor.container.getBoundingClientRect();

    // Calculate initial position relative to container
    // We use getBoundingClientRect for both anchor and container. Both are relative to viewport.
    // The `.penman-editor-area` scrolls vertically.
    // Wait, since `this.element` is appended to `this.editor.container` (the wrapper), and the wrapper does NOT scroll,
    // its absolute children stay fixed relative to the wrapper.
    // But the anchor node is inside `.penman-editor-area` which scrolls.
    // So as the user scrolls, `rect.top` changes, but `containerRect.top` does not.
    // This perfectly calculates the visual offset inside the wrapper.
    
    // BUT what if the container is the editable area?
    // In `FloatingUI.js`, we did `this.editor.container.appendChild(this.element)`.
    // `this.editor.container` is the wrapper. So it does not scroll.
    
    // However, we want Floating UIs to stay attached to their anchor, even if the user scrolls the page.
    let top, left;

    if (this.options.placement === 'top') {
        top = rect.top - containerRect.top - floatingRect.height - this.options.offset;
    } else {
        // default bottom
        top = rect.bottom - containerRect.top + this.options.offset;
    }

    left = rect.left - containerRect.left + (rect.width / 2) - (floatingRect.width / 2);

    // If the anchor is scrolled out of view, we should probably hide the floating UI or let it stay clipped.
    // However, bounding rects natively handle scroll because `rect.top` goes negative if it scrolls up out of view.
    // We do NOT want to clamp the top position to `visibleTop` if the anchor is out of bounds, because that detaches it from the anchor!

    // Viewport collision bounds (relative to container)
    // We clamp left/right to stay inside the editor bounds.
    const visibleLeft = 0;
    const visibleRight = containerRect.width;

    // Collision handling (Editor Container Bounds)
    // Prevent horizontal overflow
    if (left < visibleLeft + this.options.offset) {
      left = visibleLeft + this.options.offset;
    } else if (left + floatingRect.width > visibleRight - this.options.offset) {
      left = visibleRight - floatingRect.width - this.options.offset;
    }

    // Flip logic relative to viewport (not container bounds, because container might be tall)
    // Wait, floating UI should flip if it overflows the WINDOW viewport, but remain bounded inside the container left/right.
    // If it overflows the top of the *container*, maybe it should flip?
    // Yes, let's flip based on container bounds to keep it visible inside the editor area if possible.
    const containerVisibleTop = 0;
    const containerVisibleBottom = containerRect.height;

    // Prevent vertical overflow / Flip logic relative to editor view
    if (this.options.placement === 'top') {
        // If it goes above the container, place it below the anchor
        if (top < containerVisibleTop && rect.bottom - containerRect.top + floatingRect.height + this.options.offset <= containerVisibleBottom) {
            top = rect.bottom - containerRect.top + this.options.offset;
            this.element.classList.add('penman-floating-flipped');
        } else {
            this.element.classList.remove('penman-floating-flipped');
        }
    } else {
        // If it goes below the container, place it above the anchor
        if (top + floatingRect.height > containerVisibleBottom && rect.top - containerRect.top - floatingRect.height - this.options.offset >= containerVisibleTop) {
            top = rect.top - containerRect.top - floatingRect.height - this.options.offset;
            this.element.classList.add('penman-floating-flipped');
        } else {
            this.element.classList.remove('penman-floating-flipped');
        }
    }
    
    // Hide completely if anchor is completely outside the editable area's visible bounding box
    const editableRect = this.editor.editableArea ? this.editor.editableArea.getBoundingClientRect() : containerRect;
    if (rect.bottom < editableRect.top || rect.top > editableRect.bottom) {
        this.element.style.display = 'none';
        return;
    }
    
    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
  }

  /**
   * Hides the floating UI but keeps it mounted
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Shows the floating UI
   */
  show() {
      if (this.element && (this.anchorNode || this.anchorRange)) {
          this.isVisible = true;
          this.update();
      }
  }

  /**
   * Destroys the floating UI, removing it from DOM and cleaning up events
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.anchorNode = null;
    this.anchorRange = null;
    this.isVisible = false;

    window.removeEventListener('resize', this._handleScrollOrResize);
    window.removeEventListener('scroll', this._handleScrollOrResize, true);
  }

  _handleScrollOrResize() {
    if (this.isVisible) {
      // Throttle/debounce could be added here if performance suffers
      requestAnimationFrame(() => this.update());
    }
  }
}
