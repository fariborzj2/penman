/**
 * EventEmitter class to handle subscribing, unsubscribing, and emitting events.
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - The name of the event
   * @param {Function} listener - The callback function
   */
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - The name of the event
   * @param {Function} listener - The callback function
   */
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  /**
   * Emit an event
   * @param {string} event - The name of the event
   * @param {...any} args - Arguments to pass to the listeners
   */
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}
