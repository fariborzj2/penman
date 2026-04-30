// src/plugins/CodeBlockPlugin/index.js
import { setupCodeBlockPlugin } from './CodeBlockPlugin.js';

export const CodeBlockPlugin = {
  name: 'codeblock',
  setup: setupCodeBlockPlugin
};

export { setupCodeBlockPlugin };
