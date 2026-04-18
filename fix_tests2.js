const fs = require('fs');
let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

// The test 'wraps raw text when next to div' was checking:
// sanitize("<div>متن داخل div</div>\nمتن بیرون از تگ")
// with the new sanitizer, the unconfigured `div` gets unwrapped.
// So the result is exactly `<p>متن داخل div\nمتن بیرون از تگ</p>`
content = content.replace(/expect\(html\)\.toBe\('<div>متن داخل div<\\\/div><p>\\\\nمتن بیرون از تگ<\\\/p>'\);/g, "expect(html).toBe('<p>متن داخل div\\nمتن بیرون از تگ</p>');");

fs.writeFileSync('src/sanitization/Sanitizer.test.js', content);
