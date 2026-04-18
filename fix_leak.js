const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.js', 'utf8');

// Remove the global leak
content = content.replace(
`                // Also add to global allowed styles just in case
                if (!this.allowedStyles.includes(kebabKey)) {
                     this.allowedStyles.push(kebabKey);
                }`,
""
);

fs.writeFileSync('src/sanitization/Sanitizer.js', content);
