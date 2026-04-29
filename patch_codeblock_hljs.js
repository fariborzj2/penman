const fs = require('fs');
let content = fs.readFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', 'utf8');

// Also inject syntax highlighting via inline styles instead of heavy libraries since we want a lightweight solution
// But we actually only need the font color right now based on user feedback.

const fixStyle = `
             pre.setAttribute('dir', 'ltr');
             pre.style.textAlign = 'left';
             pre.style.whiteSpace = 'pre-wrap';
             pre.style.fontFamily = 'Consolas, Monaco, \"Andale Mono\", \"Ubuntu Mono\", monospace';
             pre.style.backgroundColor = '#1e1e1e';
             pre.style.color = '#d4d4d4';
             pre.style.padding = '1em';
             pre.style.borderRadius = '5px';
             pre.style.overflowX = 'auto';
             code.setAttribute('dir', 'ltr');
             code.style.fontFamily = 'inherit';
`;

content = content.replace(/pre\.setAttribute\('dir', 'ltr'\);\s*pre\.style\.textAlign = 'left';\s*pre\.style\.whiteSpace = 'pre-wrap';\s*pre\.style\.fontFamily = 'monospace';\s*pre\.style\.backgroundColor = '#f4f4f4';\s*pre\.style\.padding = '10px';\s*pre\.style\.borderRadius = '5px';\s*pre\.style\.overflowX = 'auto';\s*code\.setAttribute\('dir', 'ltr'\);\s*code\.style\.fontFamily = 'monospace';/, fixStyle);

fs.writeFileSync('src/plugins/CodeBlockPlugin/CodeBlockPlugin.js', content);
