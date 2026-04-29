const fs = require('fs');
let content = fs.readFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', 'utf8');

const fixStyle = `
                        newNode.setAttribute('dir', 'ltr');
                        newNode.style.textAlign = 'left';
                        newNode.style.whiteSpace = 'pre-wrap';
                        newNode.style.fontFamily = 'Consolas, Monaco, \"Andale Mono\", \"Ubuntu Mono\", monospace';
                        newNode.style.backgroundColor = '#1e1e1e';
                        newNode.style.color = '#d4d4d4';
                        newNode.style.padding = '1em';
                        newNode.style.borderRadius = '5px';
                        newNode.style.overflowX = 'auto';

                        // we should wrap its content with a code tag
                        if (!newNode.querySelector('code')) {
                            const codeTag = document.createElement('code');
                            codeTag.setAttribute('dir', 'ltr');
                            codeTag.style.fontFamily = 'inherit';
`;

content = content.replace(/newNode\.setAttribute\('dir', 'ltr'\);\s*newNode\.style\.textAlign = 'left';\s*newNode\.style\.whiteSpace = 'pre-wrap';\s*newNode\.style\.fontFamily = 'monospace';\s*newNode\.style\.backgroundColor = '#f4f4f4';\s*newNode\.style\.padding = '10px';\s*newNode\.style\.borderRadius = '5px';\s*newNode\.style\.overflowX = 'auto';\s*\/\/ we should wrap its content with a code tag\s*if \(!newNode\.querySelector\('code'\)\) \{\s*const codeTag = document\.createElement\('code'\);\s*codeTag\.setAttribute\('dir', 'ltr'\);\s*codeTag\.style\.fontFamily = 'monospace';/, fixStyle);

fs.writeFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', content);
