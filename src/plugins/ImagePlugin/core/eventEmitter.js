/**
 * Simple event emitting for async propagation.
 * Wraps editor.emit or standard DOM events if not present.
 */

export function emitImageEvent(editor, eventName, payload) {
  if (editor && typeof editor.emit === 'function') {
    editor.emit(eventName, payload);
  } else if (editor && editor.editableArea) {
    // Fallback if editor.emit is not standard
    const event = new CustomEvent(eventName, { detail: payload });
    editor.editableArea.dispatchEvent(event);
  }
}
