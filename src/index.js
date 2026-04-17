import { Editor } from './core/Editor.js';
import { PluginManager } from './plugins/PluginManager.js';
import './styles/fonts/vazirmatn/Vazirmatn-font-face.css';
import './styles/penman-ui.css';
import './styles/penman-content.css';

// Registry for instance management
const instances = {};

const penman = {
  init: (options) => {
    const editor = new Editor(options);

    // Store in registry by textarea id if available
    const id = editor.textarea.id;
    if (id) {
      instances[id] = editor;
    }

    // Keep a reference to the selector for getting
    if (options.selector) {
      instances[options.selector] = editor;
    }

    editor.on('destroy', (instance) => {
        penman.remove(instance);
    });

    return editor;
  },

  /**
   * Get an editor instance by its selector or id
   * @param {string} selector - The selector or id of the textarea
   * @returns {Editor|null} The editor instance or null if not found
   */
  get: (selector) => {
    // If passed without '#', try with '#'
    if (instances[selector]) {
      return instances[selector];
    }
    if (instances['#' + selector]) {
      return instances['#' + selector];
    }

    // Fallback: search by actual textarea element matches
    for (const key in instances) {
      const editor = instances[key];
      if (editor.textarea.matches(selector)) {
        return editor;
      }
    }
    return null;
  },

  /**
   * Remove an instance from the registry
   * @param {string|Editor} identifier - The selector, id or editor instance
   */
  remove: (identifier) => {
    if (identifier instanceof Editor) {
      for (const key in instances) {
        if (instances[key] === identifier) {
          delete instances[key];
        }
      }
    } else {
      if (instances[identifier]) {
        delete instances[identifier];
      }
      if (instances['#' + identifier]) {
        delete instances['#' + identifier];
      }
    }
  },

  PluginManager: PluginManager
};

export default penman;
