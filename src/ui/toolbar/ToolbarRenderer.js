import { PriorityResolver } from './PriorityResolver.js';
import { RowLayoutManager } from './RowLayoutManager.js';
import { ResizeHandler } from './ResizeHandler.js';

export class ToolbarRenderer {
  constructor(editor, uimanager) {
    this.editor = editor;
    this.uimanager = uimanager;

    this.toolbarElement = null;
    this.rowManagers = [];
    this.resizeHandler = null;

    this._handleResize = this._handleResize.bind(this);
  }

  /**
   * Renders the entire toolbar structure based on the config.
   * @param {Object|string} config - The toolbar configuration.
   * @returns {HTMLElement} The root toolbar element.
   */
  render(config) {
    this.toolbarElement = document.createElement('div');
    this.toolbarElement.className = 'penman-toolbar-wrapper';

    const rowsConfig = this._parseConfig(config);

    rowsConfig.forEach(rowConfig => {
       const resolvedItems = PriorityResolver.resolve(rowConfig);
       if (resolvedItems.length === 0) return;

       const rowElement = document.createElement('div');
       rowElement.className = 'penman-toolbar-row penman-toolbar'; // keep legacy class for styling compatibility
       this.toolbarElement.appendChild(rowElement);

       const rowManager = new RowLayoutManager(
           this.editor,
           resolvedItems,
           rowElement,
           (cmd) => this.uimanager._createButton(cmd)
       );

       rowManager.renderInitial();
       this.rowManagers.push(rowManager);
    });

    // We can't update layout until the element is actually in the DOM and has width.
    // The ResizeObserver will trigger immediately once attached to the DOM.
    this.resizeHandler = new ResizeHandler(this.toolbarElement, this._handleResize);
    this.resizeHandler.start();

    return this.toolbarElement;
  }

  _parseConfig(config) {
    if (!config) return [];

    if (typeof config === 'string') {
        // Legacy parsing: 'undo redo | bold italic' -> single row
        const parts = config.trim().split(/\s+/);
        return [parts];
    }

    if (config.rows && Array.isArray(config.rows)) {
        return config.rows;
    }

    return [];
  }

  _handleResize(newWidth) {
     if (newWidth <= 0) return;
     this.rowManagers.forEach(rm => rm.updateLayout(newWidth));
  }

  destroy() {
    if (this.resizeHandler) {
       this.resizeHandler.stop();
    }
    this.rowManagers.forEach(rm => rm.destroy());
    this.rowManagers = [];
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.parentNode.removeChild(this.toolbarElement);
    }
  }
}
