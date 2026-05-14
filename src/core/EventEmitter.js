/**
 * EventEmitter — subscribe / unsubscribe / emit.
 *
 * Implementation notes:
 *   - `emit` iterates over a SNAPSHOT (Array.from) of the listener list so a
 *     listener can safely call `.off()` (or `.on()` adding a NEW listener for
 *     the same event) during dispatch without skipping siblings.
 *   - Listener errors are caught and logged via `logger` so one broken
 *     listener doesn't break the entire dispatch chain.
 *   - `once` registers a listener that auto-unsubscribes after first call.
 */
import { logger } from '../utils/logger.js';

export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} listener
   */
  on(event, listener) {
    if (typeof listener !== 'function') return;
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }

  /**
   * Subscribe a listener that auto-removes after the first time it fires.
   * @param {string} event
   * @param {Function} listener
   */
  once(event, listener) {
    if (typeof listener !== 'function') return;
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    // Store original on the wrapper so callers could `.off(event, listener)`
    // and still detach.
    wrapper.__original = listener;
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe a listener. Removes wrappers added via once() that wrap the
   * same original function, in addition to literal matches.
   */
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => {
      return l !== listener && l.__original !== listener;
    });
  }

  /**
   * Emit an event to every listener registered for it.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (!this.events[event]) return;
    // Snapshot so off()/on() called from inside a listener don't disturb the
    // iteration of the current dispatch.
    const listeners = Array.from(this.events[event]);
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (err) {
        // A throwing listener must not break the others. Log so the bug isn't
        // silent in development.
        logger.warn(`[EventEmitter] listener for "${event}" threw:`, err);
      }
    }
  }
}
