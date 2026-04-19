export function formatHTML(htmlStr) {
    if (!htmlStr) return '';
    let formatted = '';
    let pad = 0;
    const indent = '  ';

    const blockTags = new Set([
      'div', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'figure',
      'figcaption', 'blockquote', 'nav', 'header', 'footer', 'section', 'article', 'aside', 'main'
    ]);

    const tokens = htmlStr.split(/(<\/?[^>]+>)/).filter(t => t !== '');

    let isPre = false;

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        if (token.startsWith('<pre') && !token.startsWith('</pre')) {
             isPre = true;
             if (formatted.length > 0 && !formatted.endsWith('\n')) formatted += '\n';
             formatted += indent.repeat(pad) + token;
             continue;
        }

        if (isPre) {
             formatted += token;
             if (token.startsWith('</pre>')) {
                  isPre = false;
                  formatted += '\n';
             }
             continue;
        }

        if (token.startsWith('</')) {
            const match = token.match(/^<\/([a-zA-Z0-9\-]+)/);
            const tag = match ? match[1].toLowerCase() : '';

            if (blockTags.has(tag)) {
                pad = Math.max(0, pad - 1);

                let prevToken = i > 0 ? tokens[i-1] : '';
                let blockHasInlineOnly = false;

                if (!prevToken.startsWith('<') && prevToken.trim() !== '') {
                    blockHasInlineOnly = true;
                } else if (prevToken.startsWith('<') && !prevToken.startsWith('</') && !prevToken.endsWith('/>')) {
                    const prevMatch = prevToken.match(/^<([a-zA-Z0-9\-]+)/);
                    if (prevMatch && prevMatch[1].toLowerCase() === tag) {
                        blockHasInlineOnly = true;
                    }
                } else if (prevToken.startsWith('</')) {
                     const prevMatch = prevToken.match(/^<\/([a-zA-Z0-9\-]+)/);
                     if (prevMatch && !blockTags.has(prevMatch[1].toLowerCase())) {
                         blockHasInlineOnly = true;
                     }
                } else if (prevToken.match(/^<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)/i)) {
                     // Previous was inline void like img
                     blockHasInlineOnly = true;
                }

                if (blockHasInlineOnly) {
                    formatted += token;
                } else {
                    if (formatted.length > 0 && !formatted.endsWith('\n')) {
                        formatted += '\n';
                    }
                    if (formatted.endsWith('\n')) {
                         formatted += indent.repeat(pad) + token;
                    } else {
                         formatted += token;
                    }
                }
                formatted += '\n';

            } else {
                formatted += token;
            }
        } else if (token.startsWith('<') && !token.startsWith('<!') && !token.startsWith('<?')) {
            const match = token.match(/^<([a-zA-Z0-9\-]+)/);
            const tag = match ? match[1].toLowerCase() : '';
            const isVoid = /^(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)$/i.test(tag);

            if (blockTags.has(tag)) {
                if (formatted.length > 0 && !formatted.endsWith('\n')) {
                    formatted += '\n';
                }
                formatted += indent.repeat(pad) + token;
                if (!token.endsWith('/>')) {
                     pad += 1;
                }
            } else if (isVoid) {
                // Formatting <br> inside a block makes sense if we want it on new line,
                // but usually it's inline. Let's just output it.
                formatted += token;
            } else {
                formatted += token;
            }
        } else {
            // Text token.
            // Only trim spaces if it's purely whitespace and between blocks
            if (token.trim() === '') {
                // If the previous token was a block tag and the next token is a block tag, we can skip
                const prevMatch = (i > 0 && tokens[i-1].match(/^<\/?([a-zA-Z0-9\-]+)/));
                const nextMatch = (i+1 < tokens.length && tokens[i+1].match(/^<\/?([a-zA-Z0-9\-]+)/));

                const prevTag = prevMatch ? prevMatch[1].toLowerCase() : '';
                const nextTag = nextMatch ? nextMatch[1].toLowerCase() : '';

                if ((!prevTag || blockTags.has(prevTag)) && (!nextTag || blockTags.has(nextTag))) {
                     continue;
                }
            }

            // If the text is not purely whitespace but starts with whitespace, and we are at the beginning of a line
            if (formatted.endsWith('\n')) {
                // It's text starting a new line inside a block (e.g. after <br>)
                formatted += indent.repeat(pad) + token;
            } else {
                formatted += token;
            }
        }
    }

    return formatted.replace(/\n\s*\n/g, '\n').trim();
}
