export class ResizeHandler {
  constructor(element, callback) {
    this.element = element;
    this.callback = callback;
    this.resizeObserver = null;
    this.scheduled = false;
  }

  start() {
    if (!this.element || typeof window.ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to debounce and prevent layout thrashing (ResizeObserver loop limit exceeded)
      if (!this.scheduled) {
        this.scheduled = true;
        window.requestAnimationFrame(() => {
          this.scheduled = false;
          if (entries && entries.length > 0) {
             const entry = entries[0];
             // Call the callback with the new width
             let newWidth = 0;
             if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
               newWidth = entry.borderBoxSize[0].inlineSize;
             } else {
               newWidth = entry.contentRect.width;
             }
             this.callback(newWidth);
          }
        });
      }
    });

    this.resizeObserver.observe(this.element);
  }

  stop() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
