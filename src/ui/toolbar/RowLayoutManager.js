import { OverflowEngine } from './OverflowEngine.js';
import { DropdownController } from './DropdownController.js';

export class RowLayoutManager {
  constructor(editor, resolvedItems, rowElement, createButtonFn) {
    this.editor = editor;
    this.resolvedItems = resolvedItems;
    this.rowElement = rowElement;
    this.createButtonFn = createButtonFn;

    this.elements = new Map(); // name -> HTMLElement
    this.dropdown = new DropdownController(editor, rowElement);
    this.overflowEngine = new OverflowEngine(this);

    this.isMeasured = false;
  }

  /**
   * Initial render of all items into the DOM to allow measurement.
   */
  renderInitial() {
    this.dropdown.render();
    this.dropdown.hideButton();

    this.resolvedItems.forEach(item => {
       if (item.isSeparator) {
          const separator = document.createElement('span');
          separator.className = 'penman-separator';
          separator.dataset.cmd = item.name;
          this.elements.set(item.name, separator);
          this.rowElement.insertBefore(separator, this.dropdown.element);
       } else {
          const btn = this.createButtonFn(item.name);
          // ensure the button has dataset.cmd
          if (!btn.dataset.cmd) {
             btn.dataset.cmd = item.name;
          }
          this.elements.set(item.name, btn);
          this.rowElement.insertBefore(btn, this.dropdown.element);
       }
    });

    this.overflowEngine.init(this.resolvedItems);
  }

  /**
   * Called to apply layout changes based on a new width.
   * @param {number} width - The new available width for the row.
   */
  updateLayout(width) {
     if (!this.isMeasured) {
         // Force a reflow/measurement pass if it's the first time
         this.dropdown.showButton(); // Ensure it has layout so we can measure it
         this.overflowEngine.measureWidths();
         this.dropdown.hideButton();
         this.isMeasured = true;
     }

     const { visible, overflow } = this.overflowEngine.calculate(width);

     // Apply DOM changes
     this._applyLayout(visible, overflow);
  }

  _applyLayout(visible, overflow) {
      // 1. Clear dropdown
      this.dropdown.clear();

      // 2. Hide everything temporarily or detach (for performance, we just manipulate DOM structure)
      // Since order is preserved in `visible`, we just re-append them before the dropdown

      visible.forEach(name => {
          const el = this.elements.get(name);
          if (el) {
              el.style.display = ''; // reset display
              // Move it before the dropdown button
              this.rowElement.insertBefore(el, this.dropdown.element);
          }
      });

      // 3. Move overflow items into the dropdown
      overflow.forEach(name => {
          const el = this.elements.get(name);
          if (el) {
              el.style.display = '';
              // Move to dropdown panel
              this.dropdown.addItem(el);
          }
      });

      // 4. Hide completely removed items (like stripped separators)
      const visibleSet = new Set(visible);
      const overflowSet = new Set(overflow);

      this.resolvedItems.forEach(item => {
          if (!visibleSet.has(item.name) && !overflowSet.has(item.name)) {
              const el = this.elements.get(item.name);
              if (el) {
                 el.style.display = 'none';
              }
          }
      });

      // 5. Toggle Dropdown button visibility
      if (overflow.length > 0) {
          this.dropdown.showButton();
      } else {
          this.dropdown.hideButton();
      }
  }

  destroy() {
    this.dropdown.destroy();
    this.elements.clear();
  }
}
