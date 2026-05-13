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

const root = document.createElement('div');
root.innerHTML = [
  '<h2>Welcome</h2>',
  '<h4>Sub</h4>',
  '<p>Lorem ipsum dolor sit amet.</p>',
  '<a href="#">click here</a>',
  '<img src="/x.jpg">',
].join('');
document.body.appendChild(root);

const engine = new AuditEngine(defaultRules);
const report = engine.analyze(root);

for (const lang of ['en', 'fa']) {
  const i18n = new I18nManager(lang);
  console.log('\n──── Language: ' + lang + ' ────');
  console.log('Quality:', i18n.t(report.labelKey));
  console.log('Score:', report.score);
  console.log('Sample issues:');
  for (const issue of report.issues.slice(0, 4)) {
    const title = i18n.t(issue.titleKey);
    const loc = issue.locKey ? i18n.t(issue.locKey, issue.locParams || {}) : '';
    const fix = issue.fixKey ? i18n.t(issue.fixKey) : '';
    console.log('  - [' + i18n.t('plugins.audit.severity.' + issue.severity) + '] ' + title);
    if (loc) console.log('    Location: ' + loc);
    if (fix) console.log('    Fix: ' + fix.slice(0, 60) + (fix.length > 60 ? '…' : ''));
  }
  // Sample category labels
  console.log('Categories:');
  for (const cat of ['seo', 'accessibility', 'links']) {
    console.log('  ' + cat + ' → ' + i18n.t('plugins.audit.categories.' + cat));
  }
}
