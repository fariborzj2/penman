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
    expect(clean).toBe('<div>Hello alert("xss") <span>World</span></div>');
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

  it('should preserve table and heading structure when rendering sanitized HTML', () => {
    const html = '<h2>Title</h2><table border="1"><tbody><tr><td data-cell-id="1">A</td></tr></tbody></table>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<h2>Title</h2><table border="1"><tbody><tr><td data-cell-id="1">A</td></tr></tbody></table>');
  });

  it('should handle complex nested malicious structures safely', () => {
    const html = '<div onmouseover="xss"><p>Safe <img src="x" onerror="xss"> <span>Text</span></p></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<div><p>Safe <img src="x"> <span>Text</span></p></div>');
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
    expect(html).toBe('<div>متن داخل div</div><p>\nمتن بیرون از تگ</p>');
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
