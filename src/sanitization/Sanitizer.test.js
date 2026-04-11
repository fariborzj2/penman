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
    expect(clean).toBe('Hello alert("xss") <span>World</span>');
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

  it('should handle complex nested malicious structures safely', () => {
    const html = '<div onmouseover="xss"><p>Safe <img src="x" onerror="xss"> <span>Text</span></p></div>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>Safe  <span>Text</span></p>');
  });
});
