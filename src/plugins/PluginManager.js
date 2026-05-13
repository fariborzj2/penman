import { setupLinkPlugin } from './LinkPlugin/index.js';
import { setupFormatPlugin } from './FormatPlugin/index.js';
import { setupListPlugin } from './ListPlugin/index.js';
import { setupBlockTypePlugin } from './BlockTypePlugin/index.js';
import { setupFontSizePlugin } from './FontSizePlugin/index.js';
import { setupRemoveFormatPlugin } from './RemoveFormatPlugin/index.js';
import { setupHorizontalRulePlugin } from './HorizontalRulePlugin/index.js';
import { setupFindReplacePlugin } from './FindReplacePlugin/index.js';
import { setupTablePlugin } from './TablePlugin/index.js';
import { setupImagePlugin } from './ImagePlugin/index.js';
import { setupColorPlugin } from './ColorPlugin/index.js';
import { setupSourceCodePlugin } from './SourceCodePlugin/index.js';
import { setupDraftPlugin } from './DraftPlugin/index.js';
import { setupDirectionPlugin } from './DirectionPlugin/index.js';
import { setupSuggestedPostsPlugin } from './SuggestedPostsPlugin/index.js';
import { setupMediaPlugin } from './MediaPlugin/index.js';
import { setupCodeBlockPlugin } from './CodeBlockPlugin/index.js';
import { setupMarkdownPlugin } from './MarkdownPlugin/index.js';
import { setupEmbedPlugin } from './EmbedPlugin/index.js';
import { setupContentAuditPlugin } from './ContentAuditPlugin/index.js';
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
    embed: setupEmbedPlugin,
    audit: setupContentAuditPlugin
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
