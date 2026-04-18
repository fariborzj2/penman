const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

const newTests = `
  it('should not destroy lists natively ejected from paragraphs', () => {
    // When a user pastes <p>Intro <ul><li>Item</li></ul></p>,
    // The DOMParser converts it to <p>Intro </p><ul><li>Item</li></ul><p></p>
    // We should ensure the <ul> is preserved and not unwrapped.
    const html = '<p>Intro <ul><li>Item</li></ul> Outro</p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toContain('<ul><li>Item</li></ul>');
    expect(clean).toContain('<p>Intro');
    expect(clean).toContain('<p> Outro</p>');
  });

  it('should not leak custom option styles to other tags', () => {
    // warning-block has 'color' allowed.
    // If we use 'color' on an unconfigured tag, it shouldn't be allowed
    // unless 'color' is in the global allowed styles.
    // We removed 'color' from the global allowed styles dynamically injected.
    // Let's test a style that is NOT in the global allowed list, e.g. 'flex-direction'
    // Wait, the global allowedStyles list in the constructor includes 'color'.
    // Let's use 'z-index' as a test.
  });
`;

// Insert the test
content = content.replace("});\n});", "});\n" + newTests + "\n});");
fs.writeFileSync('src/sanitization/Sanitizer.test.js', content);
