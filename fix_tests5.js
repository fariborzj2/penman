const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

// The `<p>` tag natively does not allow `style` in our allowedTags schema.
// In the constructor:
// p: [],
// Therefore, the test correctly stripped the style because `style` wasn't allowed on `p`.
// To test style stripping without changing the schema, we should test on a tag that ALLOWS style natively, like `span` or `div`.
content = content.replace(
  "const html = '<p class=\"some-class\" style=\"color: blue; animation: test 1s;\">Test</p>';",
  "const html = '<span class=\"some-class\" style=\"color: blue; animation: test 1s;\">Test</span>';"
);
content = content.replace(
  "expect(clean).toBe('<p style=\"color: blue\">Test</p>');",
  "expect(clean).toBe('<span style=\"color: blue\">Test</span>');"
);

fs.writeFileSync('src/sanitization/Sanitizer.test.js', content);
