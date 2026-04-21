import { Editor } from './core/Editor.js';
import { PluginManager } from './plugins/PluginManager.js';
import './styles/fonts/vazirmatn/Vazirmatn-font-face.css';
import './styles/penman-ui.css';
import './styles/penman-content.css';

// Registry for instance management
const instances = new Map();

// Global defaults for configuration
export const penmanDefaults = {
  plugins: [],
  toolbar: '',
  blockTypes: []
};

const penman = {
  init: (options) => {
    const selector = options.selector;
    const isSingleConfig = !options.resolveConfig;
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      throw new Error(`Penman Editor: Could not find any element with selector "${selector}"`);
    }

    const createdEditors = [];

    elements.forEach(el => {
      let instanceConfig = { ...penmanDefaults, ...options };
      if (options.config) {
        instanceConfig = { ...instanceConfig, ...options.config };
      }

      if (options.resolveConfig) {
        instanceConfig = options.resolveConfig(el, instanceConfig);
      }

      // Explicitly pass the element to avoid double querySelectors inside Editor
      instanceConfig.element = el;
      // Provide backwards compatibility for existing plugins using `options.selector`
      instanceConfig.selector = selector;

      const editor = new Editor(instanceConfig);

      instances.set(el, editor);
      createdEditors.push(editor);

      editor.on('destroy', (instance) => {
        penman.remove(instance);
      });
    });

    // Backwards compatibility: return single instance if only one is requested/matched without resolveConfig
    if (createdEditors.length === 1 && !options.resolveConfig) {
      return createdEditors[0];
    }

    return createdEditors;
  },

  /**
   * Get an editor instance by its selector or id
   * @param {string} selector - The selector or id of the textarea
   * @returns {Editor|null} The editor instance or null if not found
   */
  get: (selector) => {
    let target = document.querySelector(selector);
    if (!target) {
        target = document.getElementById(selector.replace(/^#/, ''));
    }
    
    if (target && instances.has(target)) {
      return instances.get(target);
    }
    
    return null;
  },
  
  /**
   * Get all initialized editor instances
   * @returns {Editor[]} Array of all editor instances
   */
  getAll: () => {
    return Array.from(instances.values());
  },
  
  /**
   * Get an editor instance by its DOM element
   * @param {HTMLElement} el - The textarea element
   * @returns {Editor|null} The editor instance or null if not found
   */
  getByElement: (el) => {
    return instances.get(el) || null;
  },

  /**
   * Get an editor instance by the name attribute of its textarea
   * @param {string} name - The name attribute of the textarea
   * @returns {Editor|null} The editor instance or null if not found
   */
  getByName: (name) => {
    const el = document.querySelector(`textarea[name="${name}"]`);
    return el ? instances.get(el) || null : null;
  },

  /**
   * Remove an instance from the registry
   * @param {string|HTMLElement|Editor} identifier - The selector, id, element, or editor instance
   */
  remove: (identifier) => {
    if (identifier instanceof Editor) {
      instances.delete(identifier.textarea);
      return;
    }
    
    if (identifier instanceof HTMLElement) {
      instances.delete(identifier);
      return;
    }
    
    const target = document.querySelector(identifier) || document.getElementById(identifier.replace(/^#/, ''));
    if (target) {
      instances.delete(target);
    }
  },

  PluginManager: PluginManager,
  defaults: penmanDefaults
};

export default penman;
