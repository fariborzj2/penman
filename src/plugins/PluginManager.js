import { setupLinkPlugin } from './LinkPlugin.js';
import { setupFormatPlugin } from './FormatPlugin/FormatPlugin.js';
import { setupListPlugin } from './ListPlugin.js';
import { setupBlockTypePlugin } from './BlockTypePlugin/BlockTypePlugin.js';
import { setupFontSizePlugin } from './FontSizePlugin/FontSizePlugin.js';
import { setupRemoveFormatPlugin } from './RemoveFormatPlugin.js';
import { setupHorizontalRulePlugin } from './HorizontalRulePlugin.js';
import { setupFindReplacePlugin } from './FindReplacePlugin/FindReplacePlugin.js';
import { setupTablePlugin } from './table/TablePlugin.js';
import { setupImagePlugin } from './ImagePlugin/index.js';
import { setupColorPlugin } from './ColorPlugin/index.js';
import { setupSourceCodePlugin } from './SourceCodePlugin/index.js';
import { setupDraftPlugin } from './DraftPlugin/index.js';
import { setupDirectionPlugin } from './DirectionPlugin/index.js';
import { setupSuggestedPostsPlugin } from './SuggestedPostsPlugin.js';
import { setupMediaPlugin } from './MediaPlugin/index.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin/CodeBlockPlugin.js';
import { setupMarkdownPlugin } from './MarkdownPlugin/MarkdownPlugin.js';
import { setupEmbedPlugin } from './EmbedPlugin/EmbedPlugin.js';
import { logger } from '../utils/logger.js';

export const PluginManager = {
  plugins: {
    link: setupLinkPlugin,
    format: setupFormatPlugin,
    list: setupListPlugin,
    blocktype: setupBlockTypePlugin,
    fontsize: setupFontSizePlugin,
    removeformat: setupRemoveFormatPlugin,
    hr: setupHorizontalRulePlugin,
    findreplace: setupFindReplacePlugin,
    table: setupTablePlugin,
    image: setupImagePlugin,
    color: setupColorPlugin,
    sourcecode: setupSourceCodePlugin,
    draft: setupDraftPlugin,
    direction: setupDirectionPlugin,
    suggestedposts: setupSuggestedPostsPlugin,
    media: setupMediaPlugin,
    codeblock: setupCodeBlockPlugin,
    markdown: setupMarkdownPlugin,
    embed: setupEmbedPlugin
  },

  add(name, setup) {
    this.plugins[name] = setup;
  },

  init(editor) {
    if (!editor) {
      logger.warn('Penman PluginManager: editor is undefined');
      return;
    }

    const configPlugins = editor.options?.plugins;

    const pluginList = this._normalizePluginList(configPlugins);

    this._runPlugins(editor, pluginList);
  },

  _normalizePluginList(configPlugins) {
    if (typeof configPlugins === 'string') {
      return configPlugins.split(/\s+/).filter(Boolean);
    }

    if (Array.isArray(configPlugins)) {
      return configPlugins;
    }

    return [];
  },

  _runPlugins(editor, pluginList) {
    pluginList.forEach(name => {
      const setup = this.plugins[name];

      if (typeof setup === 'function') {
        setup(editor);
      } else {
        logger.warn(`Penman Editor: Plugin "${name}" is not registered.`);
      }
    });
  }
};