/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Sanitizer } from './Sanitizer.js';

describe('Sanitizer Production Grade Output', () => {
  let sanitizer;

  beforeEach(() => {
    sanitizer = new Sanitizer();
  });

  it('should convert inline style bold to strong', () => {
    const html = '<p><span style="font-weight: bold">Bold Text</span></p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p><strong>Bold Text</strong></p>');
  });

  it('should convert inline style italic to em', () => {
    const html = '<p><span style="font-style: italic">Italic Text</span></p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p><em>Italic Text</em></p>');
  });

  it('should remove presentational attributes from tables', () => {
    const html = '<table border="1"><tr><td>Data</td></tr></table>';
    const clean = sanitizer.sanitize(html);
    expect(clean).not.toContain('border="1"');
  });

  it('should normalize spacing inside tags', () => {
    const html = '<p> text </p>';
    const clean = sanitizer.sanitize(html);
    expect(clean).toBe('<p>text</p>');
  });

  it('should ensure standard table structure (thead/tbody/th)', () => {
    const html = '<table><tr><td>Header</td></tr><tr><td>Data</td></tr></table>';
    const clean = sanitizer.sanitize(html);
    // Note: This is a bit complex as we need to decide if the first row is a header.
    // Usually, in many editors, the first row of a pasted table is treated as a header.
    expect(clean).toContain('<thead>');
    expect(clean).toContain('<th>Header</th>');
    expect(clean).toContain('<tbody>');
    expect(clean).toContain('<td>Data</td>');
  });

  it('should normalize Persian punctuation and spacing', () => {
    const testCases = [
      { input: 'چیست ؟', expected: 'چیست؟' },
      { input: 'روزمره ، وب گردی', expected: 'روزمره، وب‌گردی' }, // note: وب‌گردی uses nim-fasele
      { input: 'متن . فلان', expected: 'متن. فلان' },
      { input: 'کتاب ها', expected: 'کتاب‌ها' },
    ];

    testCases.forEach(({ input, expected }) => {
      const html = `<p>${input}</p>`;
      const clean = sanitizer.sanitize(html);
      expect(clean).toBe(`<p>${expected}</p>`);
    });
  });

  it('should handle nested tables without crashing or mis-normalizing', () => {
    const html = `
      <table>
        <tr>
          <td>
            Outer Header
            <table>
              <tr><td>Inner Header</td></tr>
              <tr><td>Inner Data</td></tr>
            </table>
          </td>
        </tr>
        <tr><td>Outer Data</td></tr>
      </table>
    `.trim();

    const clean = sanitizer.sanitize(html);

    // Check outer table
    expect(clean).toContain('<thead><tr><th>Outer Header');

    // Check inner table
    expect(clean).toContain('<thead><tr><th>Inner Header</th></tr></thead>');
    expect(clean).toContain('<tbody><tr><td>Inner Data</td></tr></tbody>');
  });
});
