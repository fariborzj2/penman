import { getTokens } from './index.js';

export function formatCode(text, lang) {
    if (!text) return '';
    // We only try to format compact single-line pastes to avoid breaking user formatting
    const isSingleLine = !text.includes('\n');
    if (!isSingleLine) return text;

    const tokens = getTokens(text, lang || 'javascript');
    if (tokens.length <= 1) return text;

    let result = '';
    let indentLevel = 0;
    let needIndent = false;
    let inForLoop = false;
    let parenDepth = 0;
    let forParenDepth = -1;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let val = token.value;

        if (token.type === 'string' || token.type === 'comment') {
            if (needIndent) {
                result += '  '.repeat(indentLevel);
                needIndent = false;
            }
            result += val;
            if (val.endsWith('\n')) {
                needIndent = true;
            }
            continue;
        }

        if (token.type === 'plain') {
            if (val.trim() === '') continue;
            val = val.trim();
        }

        if (token.type === 'keyword') {
            if (val === 'for') inForLoop = true;
        }

        if (token.type === 'punctuation') {
            if (val === '(') {
                parenDepth++;
                if (inForLoop && forParenDepth === -1) forParenDepth = parenDepth;
            } else if (val === ')') {
                parenDepth--;
                if (inForLoop && parenDepth <= forParenDepth) {
                    inForLoop = false;
                    forParenDepth = -1;
                }
            }
        }

        // Apply indentation
        if (needIndent && val !== '}' && val !== ']') {
            result += '  '.repeat(indentLevel);
            needIndent = false;
        } else if (needIndent && (val === '}' || val === ']')) {
            result += '  '.repeat(Math.max(0, indentLevel - 1));
            needIndent = false;
        }

        const prevChar = result.slice(-1);

        if (token.type === 'keyword') {
            if (prevChar && prevChar !== ' ' && prevChar !== '\n' && prevChar !== '(' && prevChar !== '{' && prevChar !== '[') result += ' ';
            result += val;
            if (!['this', 'super', 'null', 'true', 'false', 'break', 'continue', 'return', 'debugger'].includes(val)) {
                result += ' ';
            } else if (val === 'return' && i + 1 < tokens.length && tokens[i+1].value !== ';') {
                result += ' ';
            }
            continue;
        }

        if (token.type === 'operator') {
            if (!['++', '--', '!', '~', '.', '?.'].includes(val)) {
                if (prevChar !== ' ' && prevChar !== '\n' && prevChar !== '(' && prevChar !== '[') result += ' ';
                result += val + ' ';
            } else {
                result += val;
            }
            continue;
        }

        if (token.type === 'punctuation') {
            if (val === '{' || val === '[') {
                if (prevChar !== ' ' && prevChar !== '\n' && prevChar !== '(' && prevChar !== '[') result += ' ';
                result += val + '\n';
                indentLevel++;
                needIndent = true;
                continue;
            } else if (val === '}' || val === ']') {
                if (prevChar !== '\n' && prevChar !== '{' && prevChar !== '[') result += '\n' + '  '.repeat(Math.max(0, indentLevel - 1));
                result += val;
                
                // Only add newline after block end if not followed by semicolon or comma or closing paren
                const nextToken = tokens[i+1];
                if (!nextToken || (nextToken.value !== ';' && nextToken.value !== ',' && nextToken.value !== ')' && nextToken.value !== ']')) {
                    result += '\n';
                    needIndent = true;
                }
                
                indentLevel = Math.max(0, indentLevel - 1);
                continue;
            } else if (val === ';') {
                result += ';';
                if (!inForLoop) {
                    result += '\n';
                    needIndent = true;
                } else {
                    result += ' ';
                }
                continue;
            } else if (val === ',') {
                result += ',';
                if (parenDepth === 0 && indentLevel > 0) {
                    result += '\n';
                    needIndent = true;
                } else {
                    result += ' ';
                }
                continue;
            } else if (val === ':') {
                result += ': ';
                continue;
            }
        }

        result += val;
    }

    return result.replace(/ \n/g, '\n').replace(/\n+/g, '\n').trim();
}
