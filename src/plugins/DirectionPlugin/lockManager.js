/**
 * lockManager.js
 * Manages the data-dir-lock attribute on block elements.
 * Locked blocks are immune to automatic direction detection.
 */

export class LockManager {
  /**
   * @param {Object} config
   * @param {string}  config.attribute        Attribute name (default 'data-dir-lock')
   * @param {boolean} config.persistOnEmpty   Keep lock when block content is emptied
   */
  constructor(config = {}) {
    this.attribute = config.attribute || 'data-dir-lock';
    this.persistOnEmpty = config.persistOnEmpty !== false; // default true
  }

  /**
   * Returns true if the block element is locked.
   * @param {Element} block
   */
  isLocked(block) {
    return block.getAttribute(this.attribute) === 'true';
  }

  /**
   * Locks the block to prevent auto-detection from changing its direction.
   * @param {Element} block
   */
  lock(block) {
    block.setAttribute(this.attribute, 'true');
  }

  /**
   * Removes the lock from the block.
   * @param {Element} block
   */
  unlock(block) {
    block.removeAttribute(this.attribute);
  }

  /**
   * If persistOnEmpty is false, remove the lock when the block becomes empty.
   * Should be called after each input event.
   * @param {Element} block
   */
  handleEmpty(block) {
    if (this.persistOnEmpty) return;
    const text = (block.innerText || block.textContent || '').trim();
    if (!text) {
      this.unlock(block);
    }
  }

  /**
   * Remove the lock attribute from all blocks within the given root.
   * Used for paste normalization.
   * @param {Element} root
   */
  stripAll(root) {
    const locked = root.querySelectorAll(`[${this.attribute}]`);
    locked.forEach(el => el.removeAttribute(this.attribute));
  }
}
