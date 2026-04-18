const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

// The sanitizer's _wrapOrphanText function automatically wraps naked inline elements (like `span`) in `<p>`.
// So `<span ...>` becomes `<p><span ...></p>`. This is correct editor behavior.
content = content.replace(
  "expect(clean).toBe('<span style=\"color: blue\">Test</span>');",
  "expect(clean).toBe('<p><span style=\"color: blue\">Test</span></p>');"
);

fs.writeFileSync('src/sanitization/Sanitizer.test.js', content);
