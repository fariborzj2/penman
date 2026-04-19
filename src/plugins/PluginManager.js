import { setupLinkPlugin } from './LinkPlugin.js';
import { setupFormatPlugin } from './FormatPlugin.js';
import { setupListPlugin } from './ListPlugin.js';
import { setupBlockTypePlugin } from './BlockTypePlugin.js';
import { setupFontSizePlugin } from './FontSizePlugin.js';
import { setupUnlinkPlugin } from './UnlinkPlugin.js';
import { setupRemoveFormatPlugin } from './RemoveFormatPlugin.js';
import { setupHorizontalRulePlugin } from './HorizontalRulePlugin.js';
import { setupFindReplacePlugin } from './FindReplacePlugin.js';
import { setupTablePlugin } from './TablePlugin.js';
import { setupImagePlugin } from './ImagePlugin/index.js';
import { setupColorPlugin } from './ColorPlugin/index.js';

export const PluginManager = {
  plugins: {
    'link': setupLinkPlugin,
    'format': setupFormatPlugin,
    'list': setupListPlugin,
    'blocktype': setupBlockTypePlugin,
    'fontsize': setupFontSizePlugin,
    'unlink': setupUnlinkPlugin,
    'removeformat': setupRemoveFormatPlugin,
    'hr': setupHorizontalRulePlugin,
    'findreplace': setupFindReplacePlugin,
    'table': setupTablePlugin,
    'image': setupImagePlugin,
    'color': setupColorPlugin
  },

  /**
   * Registers a plugin to the global system
   * @param {string} name - The plugin name
   * @param {function} setup - The setup function that receives the editor instance
   */
  add(name, setup) {
    this.plugins[name] = setup;
  },

  /**
   * Initializes plugins for a specific editor instance
   * @param {Editor} editor
   */
  init(editor) {
    const configPlugins = editor.options.plugins || [];
    let pluginList = [];

    if (typeof configPlugins === 'string') {
      pluginList = configPlugins.split(/\s+/).filter(Boolean);
    } else if (Array.isArray(configPlugins)) {
      pluginList = configPlugins;
    }

    pluginList.forEach(pluginName => {
      const setup = this.plugins[pluginName];
      if (typeof setup === 'function') {
        setup(editor);
      } else {
        console.warn(`Penman Editor: Plugin "${pluginName}" is not registered.`);
      }
    });
  }
};
