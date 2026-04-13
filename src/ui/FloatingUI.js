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

    // We append to the editor's main container or document body.
    // Document body is usually safer for floating elements to avoid `overflow: hidden` issues.
    document.body.appendChild(this.element);

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

    // Calculate initial position (bottom-center of anchor)
    let top = rect.bottom + this.options.offset + window.scrollY;
    let left = rect.left + (rect.width / 2) - (floatingRect.width / 2) + window.scrollX;

    // Collision handling (Viewport)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Prevent horizontal overflow
    if (left < window.scrollX) {
      left = window.scrollX + this.options.offset;
    } else if (left + floatingRect.width > window.scrollX + viewportWidth) {
      left = window.scrollX + viewportWidth - floatingRect.width - this.options.offset;
    }

    // Prevent vertical overflow
    // If it goes below the screen, place it above the anchor
    if (rect.bottom + floatingRect.height + this.options.offset > viewportHeight &&
        rect.top - floatingRect.height - this.options.offset > 0) {
       top = rect.top - floatingRect.height - this.options.offset + window.scrollY;
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
