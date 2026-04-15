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
    expect(clean).toBe('<a>Click</a>');

    // Also test with obfuscated invisible characters
    const obfuscatedHtml = '<a href="jav&#x09;ascript:alert(1)">Click</a>';
    const cleanObfuscated = sanitizer.sanitize(obfuscatedHtml);
    expect(cleanObfuscated).toBe('<a>Click</a>');
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
