import { escapeHtml } from './escape.js';

export function renderTokens(tokens) {
  let html = '';
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const escapedValue = escapeHtml(token.value);
    
    if (token.type === 'plain') {
      html += escapedValue;
    } else {
      html += `<span class="penman-token-${token.type}">${escapedValue}</span>`;
    }
  }
  
  return html;
}
