const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

// Append some new tests specifically for the strict structure and dynamic features
const newTests = `

describe('Sanitizer Strict Structural Normalization', () => {
  let sanitizer;

  beforeEach(() => {
    sanitizer = new Sanitizer({
      options: {
        blockTypes: [
          { name: 'Warning', cmd: 'div', class: 'warning-block', optionStyle: { color: 'red' } }
        ]
      }
    });
  });

  it('should unwrap unconfigured divs and flatten the DOM', () => {
    const html = '<h3><div class="message-container"><div class="mat-typography markdown typography"><p>Hello</p></div></div></h3>';
    const clean = sanitizer.sanitize(html);
    // h3 > div > div > p -> h3 cannot have p or div, and unconfigured divs are unwrapped.
    // Result should be <h3>Hello</h3>
    expect(clean).toBe('<h3>Hello</h3>');
  });

  it('should preserve configured blockTypes (e.g. warning-block) but unwrap invalid wrappers', () => {
    const html = '<div class="message-container"><div class="warning-block" style="color: red; font-size: 20px;"><p>Text</p></div></div>';
    const clean = sanitizer.sanitize(html);
    // message-container is unconfigured -> unwrap
    // warning-block is configured, color is configured style. font-size is in global allowed styles.
    // div > p is valid structure, wait, div can contain p.
    expect(clean).toBe('<div class="warning-block" style="color: red; font-size: 20px;"><p>Text</p></div>');
  });

  it('should remove unconfigured classes and styles', () => {
    const html = '<p class="some-class" style="border: 1px solid black; animation: test 1s;">Test</p>';
    const clean = sanitizer.sanitize(html);
    // some-class is removed. animation is removed. border is allowed globally.
    expect(clean).toBe('<p style="border: 1px solid black;">Test</p>');
  });

  it('should unwrap empty spans that have no attributes', () => {
    const html = '<p><span class="bad-class">Text</span></p>';
    const clean = sanitizer.sanitize(html);
    // bad-class removed -> span has no attributes -> unwrapped
    expect(clean).toBe('<p>Text</p>');
  });

  it('should preserve spans with allowed styles', () => {
    const html = '<p><span style="color: red;">Text</span></p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p><span style="color: red;">Text</span></p>');
  });
});
`;

fs.writeFileSync('src/sanitization/Sanitizer.test.js', content + newTests);
