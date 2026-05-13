/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Sanitizer } from './Sanitizer.js';

describe('Sanitizer', () => {
  let sanitizer;

  beforeEach(() => {
    sanitizer = new Sanitizer();
  });

  it('should allow whitelisted tags and attributes', () => {
    const html = '<p>Hello <b>World</b> <a href="http://example.com" target="_blank">Link</a></p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe(html);
  });

  it('should unwrap non-whitelisted tags but keep text', () => {
    const html = '<div>Hello <script>alert("xss")</script> <span>World</span></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>Hello alert("xss") World</p>');
  });

  it('should remove disallowed attributes', () => {
    const html = '<p onclick="alert(1)" style="color:red" class="my-class">Text</p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>Text</p>');
  });

  it('should neutralize javascript: hrefs', () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p><a>Click</a></p>');

    // Also test with obfuscated invisible characters
    const obfuscatedHtml = '<a href="jav&#x09;ascript:alert(1)">Click</a>';
    const cleanObfuscated = sanitizer.sanitize(obfuscatedHtml);
    expect(cleanObfuscated).toBe('<p><a>Click</a></p>');
  });

  it('should strip non-allowlisted href schemes (data:, vbscript:, blob:, file:)', () => {
    const cases = [
      '<a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;">x</a>',
      '<a href="vbscript:msgbox(1)">x</a>',
      '<a href="blob:https://example.com/abc">x</a>',
      '<a href="file:///etc/passwd">x</a>',
      '<a href="  javascript:alert(1)">x</a>',
      '<a href="JavaScript:alert(1)">x</a>',
    ];
    for (const html of cases) {
      const clean = sanitizer.sanitize(html);
      expect(clean).not.toContain('href=');
    }
  });

  it('should preserve safe href schemes (http, https, mailto, tel, #, relative)', () => {
    const cases = [
      ['<a href="http://example.com">x</a>', 'http://example.com'],
      ['<a href="https://example.com/path?q=1">x</a>', 'https://example.com/path?q=1'],
      ['<a href="mailto:a@b.com">x</a>', 'mailto:a@b.com'],
      ['<a href="tel:+1234">x</a>', 'tel:+1234'],
      ['<a href="#section">x</a>', '#section'],
      ['<a href="/relative/path">x</a>', '/relative/path'],
      ['<a href="./foo.html">x</a>', './foo.html'],
    ];
    for (const [html, expectedHref] of cases) {
      const clean = sanitizer.sanitize(html);
      expect(clean).toContain(`href="${expectedHref}"`);
    }
  });

  it('should strip non-http(s) iframe src', () => {
    const cases = [
      '<iframe src="javascript:alert(1)"></iframe>',
      '<iframe src="data:text/html,x"></iframe>',
      '<iframe src="mailto:a@b.com"></iframe>',
      '<iframe src="vbscript:msgbox(1)"></iframe>',
    ];
    for (const html of cases) {
      const clean = sanitizer.sanitize(html);
      expect(clean).not.toContain('src=');
    }
  });

  it('should preserve http(s) iframe src', () => {
    const html = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toContain('src="https://www.youtube.com/embed/abc"');
  });

  it('should preserve table and heading structure when rendering sanitized HTML', () => {
    const html = '<h2>Title</h2><table border="1"><tbody><tr><td data-cell-id="1">A</td></tr></tbody></table>';
    const clean = sanitizer.sanitize(html);
    // Use regex to account for the auto-generated data-table-id
    expect(clean).toMatch(/<h2>Title<\/h2><table data-table-id="t-[a-z0-9]+"><thead><tr><th data-cell-id="1"><p>A<\/p><\/th><\/tr><\/thead><tbody><\/tbody><\/table>/);
  });

  it('should handle complex nested malicious structures safely', () => {
    const html = '<div onmouseover="xss"><p>Safe <img src="x" onerror="xss"> <span>Text</span></p></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>Safe <img src="x"> Text</p>');
  });
});

describe('Sanitizer normalizes orphaned text', () => {
  it('wraps raw text in p', () => {
    const sanitizer = new Sanitizer();
    const html = sanitizer.sanitize("سلام این یک متن تستی است");
    expect(html).toBe("<p>سلام این یک متن تستی است</p>");
  });

  it('wraps raw text when next to div', () => {
    const sanitizer = new Sanitizer();
    const html = sanitizer.sanitize("<div>متن داخل div</div>\nمتن بیرون از تگ");
    expect(html).toBe("<p>متن داخل div\nمتن بیرون از تگ</p>");
  });

  it('does not double wrap paragraphs', () => {
    const sanitizer = new Sanitizer();
    const html = sanitizer.sanitize("<p>متن از قبل داخل پاراگراف</p>");
    expect(html).toBe("<p>متن از قبل داخل پاراگراف</p>");
  });

  it('wraps inline elements alongside text', () => {
    const sanitizer = new Sanitizer();
    const html = sanitizer.sanitize("<b>متن بولد</b> متن ساده");
    expect(html).toBe("<p><b>متن بولد</b> متن ساده</p>");
  });
});

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
    expect(clean).toBe('<h3>Hello</h3>');
  });

  it('should preserve configured blockTypes (e.g. warning-block) but unwrap invalid wrappers', () => {
    const html = '<div class="message-container"><div class="warning-block" style="color: red; font-size: 20px;"><p>Text</p></div></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<div class="warning-block" style="color: red"><p>Text</p></div>');
  });

  it('should remove unconfigured classes and styles', () => {
    const html = '<span class="some-class" style="color: #0000ff; animation: test 1s;">Test</span>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p><span style="color: #0000ff">Test</span></p>');
  });

  it('should unwrap empty spans that have no attributes', () => {
    const html = '<p><span class="bad-class">Text</span></p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>Text</p>');
  });

  it('should preserve spans with allowed styles', () => {
    const html = '<p><span style="color: #ff0000;">Text</span></p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p><span style="color: #ff0000">Text</span></p>');
  });
});

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
    expect(clean).toContain('<p>Outro</p>');
  });

  it('should not leak custom option styles to other tags', () => {
    const validHtml = '<div class="custom-block" style="z-index: 99"><p>Valid</p></div>';
    const cleanValid = sanitizer.sanitize(validHtml);
    expect(cleanValid).toBe('<div class="custom-block" style="z-index: 99"><p>Valid</p></div>');

    const invalidHtml = '<p style="z-index: 99">Invalid</p>';
    const cleanInvalid = sanitizer.sanitize(invalidHtml);
    expect(cleanInvalid).toBe('<p>Invalid</p>');
  });
});

describe('Sanitizer Ultimate Strictness', () => {
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

  it('should remove root wrapper div', () => {
    const html = '<div><p>Content</p></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>Content</p>');
  });

  it('should completely strip arbitrary inline styles and unused spans', () => {
    const html = '<p><span style="margin: 50px; font-size: 16px;">Text</span></p>';
    const clean = sanitizer.sanitize(html);
    // margin is not allowed on span. font-size is.
    expect(clean).toBe('<p><span style="font-size: 16px">Text</span></p>');

    const html2 = '<p><span style="margin: 50px;">Text</span></p>';
    const clean2 = sanitizer.sanitize(html2);
    // margin removed -> span empty -> span unwrapped
    expect(clean2).toBe('<p>Text</p>');
  });

  it('should fix invalid nesting of p inside li', () => {
    const html = '<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
  });

  it('should enforce strict blockTypes matching', () => {
    // Has class warning-block, but tag is p -> strip class
    const html1 = '<p class="warning-block">Text</p>';
    expect(sanitizer.sanitize(html1)).toBe('<p>Text</p>');

    // Tag div, but class error-block -> unwrap div
    const html2 = '<div class="error-block"><p>Text</p></div>';
    expect(sanitizer.sanitize(html2)).toBe('<p>Text</p>');

    // Exact match: div + warning-block
    const html3 = '<div class="warning-block" style="color: red"><p>Text</p></div>';
    expect(sanitizer.sanitize(html3)).toBe('<div class="warning-block" style="color: red"><p>Text</p></div>');
  });

  it('should strip event handlers even on protected (data-penman-core) nodes', () => {
    // Attempt to smuggle XSS by claiming protected status.
    const html = '<div data-penman-core="true" onclick="alert(1)" onmouseover="alert(2)"><p>Trusted widget</p></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onmouseover');
    expect(clean).not.toContain('alert');
    // The data-penman-core marker itself can stay — the dangerous attrs are gone.
    expect(clean).toContain('Trusted widget');
  });

  it('should strip javascript: hrefs on protected nodes', () => {
    const html = '<div data-penman-core="true"><a href="javascript:alert(1)">click</a></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).not.toContain('href=');
    expect(clean).not.toContain('javascript');
  });

  it('should reject dangerous iframe src on protected nodes', () => {
    const html = '<div data-penman-core="true"><iframe src="javascript:alert(1)"></iframe></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).not.toContain('src=');
  });

  it('should strip javascript: in style values on protected nodes', () => {
    const html = '<div data-penman-core="true" style="background: url(javascript:alert(1))"><p>x</p></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).not.toContain('javascript');
  });

  it('should strip srcdoc and formaction even on protected nodes', () => {
    const html = '<div data-penman-core="true"><iframe srcdoc="<script>alert(1)</script>"></iframe></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).not.toContain('srcdoc');
    expect(clean).not.toContain('<script');
  });
});

describe('Sanitizer table ID generation', () => {
  let sanitizer;

  beforeEach(() => {
    sanitizer = new Sanitizer();
  });

  it('should generate missing data-table-id and data-cell-id', () => {
    const html = '<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table>';
    const clean = sanitizer.sanitize(html);

    // Check for table ID
    expect(clean).toMatch(/<table data-table-id="t-[a-z0-9]+"/);
    // Check for cell IDs (now th because of normalization promoting first row)
    expect(clean).toMatch(/<th data-cell-id="c-[a-z0-9]+"><p>Cell 1<\/p><\/th>/);
    expect(clean).toMatch(/<th data-cell-id="c-[a-z0-9]+"><p>Cell 2<\/p><\/th>/);
  });

  it('should preserve existing data-table-id and data-cell-id', () => {
    const html = '<table data-table-id="t-existing"><tbody><tr><td data-cell-id="c-existing">Cell</td></tr></tbody></table>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toContain('data-table-id="t-existing"');
    expect(clean).toContain('data-cell-id="c-existing"');
  });
});
