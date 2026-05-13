import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.DOMParser = dom.window.DOMParser;
global.CSS = { escape: (s) => s.replace(/[^a-zA-Z0-9_-]/g, '\\$&') };

const { AuditEngine } = await import('./src/plugins/ContentAuditPlugin/AuditEngine.js');
const { defaultRules } = await import('./src/plugins/ContentAuditPlugin/rules.js');
const { I18nManager } = await import('./src/i18n/I18nManager.js');

// Test cases — each link's href is set programmatically since attributes
// with spaces can survive setAttribute
const tests = [
  { href: 'http: //example-broken-link- /start', label: 'User example (spaces + trailing hyphen)', shouldFlag: true },
  { href: 'http://example.com',                  label: 'Valid http URL',                          shouldFlag: false },
  { href: 'https://example.com/foo/bar',         label: 'Valid https URL with path',               shouldFlag: false },
  { href: 'http:/example.com',                   label: 'Broken scheme (single slash)',            shouldFlag: true },
  { href: 'https:example.com',                   label: 'Broken scheme (no slashes)',              shouldFlag: true },
  { href: 'http://example',                      label: 'No TLD',                                  shouldFlag: true },
  { href: 'http://-bad.example.com',             label: 'Label starts with hyphen',                shouldFlag: true },
  { href: 'http://bad-.example.com',             label: 'Label ends with hyphen',                  shouldFlag: true },
  { href: 'http://example .com',                 label: 'Space in hostname',                       shouldFlag: true },
  { href: 'http://example.com/path with space',  label: 'Space in path',                           shouldFlag: true },
  { href: '#section',                            label: 'Fragment link',                           shouldFlag: false },
  { href: '/relative/path',                      label: 'Relative link',                           shouldFlag: false },
  { href: 'mailto:a@b.com',                      label: 'Mailto',                                  shouldFlag: false },
  { href: 'http://localhost',                    label: 'localhost (special)',                     shouldFlag: false },
  { href: 'http://192.168.1.1',                  label: 'IPv4',                                    shouldFlag: false },
];

const root = document.createElement('div');
tests.forEach((t, i) => {
  const a = document.createElement('a');
  a.setAttribute('href', t.href);
  a.textContent = 'link ' + i;
  root.appendChild(a);
});
document.body.appendChild(root);

const engine = new AuditEngine(defaultRules);
const report = engine.analyze(root);
const broken = report.issues.filter(i => i.ruleId === 'link-malformed');

console.log('Flagged as broken:');
broken.forEach(b => console.log('  → ' + JSON.stringify(b.locParams.url)));
console.log('');

const i18nFa = new I18nManager('fa');
console.log('Persian sample:', i18nFa.t(broken[0].titleKey));
console.log('Persian fix:', i18nFa.t(broken[0].fixKey));

console.log('');
console.log('── Verification ──');
let pass = 0, fail = 0;
const flaggedHrefs = new Set(broken.map(b => b.element ? b.element.getAttribute('href') : ''));
for (const t of tests) {
  const wasFlagged = flaggedHrefs.has(t.href);
  const correct = wasFlagged === t.shouldFlag;
  if (correct) pass++; else fail++;
  console.log('  ' + (correct ? '✓' : '✗') + ' ' + t.label + (correct ? '' : ' (expected ' + t.shouldFlag + ', got ' + wasFlagged + ')'));
}
console.log('\nPASS: ' + pass + '/' + tests.length);
