const fs = require('fs');

const editorFile = 'src/core/Editor.js';
let content = fs.readFileSync(editorFile, 'utf8');

// Replace "this.sanitizer = new Sanitizer();" with "this.sanitizer = new Sanitizer(this);"
content = content.replace(/this\.sanitizer\s*=\s*new\s*Sanitizer\(\);/g, 'this.sanitizer = new Sanitizer(this);');

fs.writeFileSync(editorFile, content);
