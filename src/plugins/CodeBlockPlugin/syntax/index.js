import { tokenize } from './core.js';
import { renderTokens } from './renderer.js';
import { escapeHtml } from './escape.js';

import javascript from './languages/javascript.js';
import html from './languages/html.js';
import css from './languages/css.js';
import json from './languages/json.js';
import php from './languages/php.js';
import bash from './languages/bash.js';
import sql from './languages/sql.js';

const grammars = {
  javascript, js: javascript,
  html,
  css,
  json,
  php,
  bash, sh: bash,
  sql
};

export function highlight(code, lang) {
  if (!code) return '';
  const rules = grammars[lang];
  if (!rules) {
    return escapeHtml(code);
  }
  const tokens = tokenize(code, rules);
  return renderTokens(tokens);
}
