const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

// First let's remove the broken append
content = content.replace(/\n  it\('should not destroy lists natively ejected from paragraphs'.*?\n\}\);\n/s, '');

// Now do it properly by adding a new blockType with a weird style property just for testing
const blockTypeTest = `
describe('Sanitizer Leak and Restructure tests', () => {
  let sanitizer;

  beforeEach(() => {
    sanitizer = new Sanitizer({
      options: {
        blockTypes: [
          { name: 'Custom', cmd: 'div', class: 'custom-block', optionStyle: { zIndex: '99' } }
        ]
      }
    });
  });

  it('should not destroy lists natively ejected from paragraphs', () => {
    const html = '<p>Intro <ul><li>Item</li></ul> Outro</p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toContain('<ul><li>Item</li></ul>');
    expect(clean).toContain('<p>Intro');
    expect(clean).toContain('<p> Outro</p>');
  });

  it('should not leak custom option styles to other tags', () => {
    // Custom block allows z-index
    const validHtml = '<div class="custom-block" style="z-index: 99"><p>Valid</p></div>';
    const cleanValid = sanitizer.sanitize(validHtml);
    expect(cleanValid).toBe('<div class="custom-block" style="z-index: 99"><p>Valid</p></div>');

    // Normal paragraph trying to use z-index should be stripped
    const invalidHtml = '<p style="z-index: 99">Invalid</p>';
    const cleanInvalid = sanitizer.sanitize(invalidHtml);
    expect(cleanInvalid).toBe('<p>Invalid</p>');
  });
});
`;

fs.writeFileSync('src/sanitization/Sanitizer.test.js', content + blockTypeTest);
