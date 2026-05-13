// Quick demonstration of the ContentAuditPlugin running in Node + jsdom.
//
//   npm install --no-save jsdom
//   node test-audit.mjs
//
// This file is for manual verification only — feel free to delete it.

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

console.log('Score:', report.score, '/100 -', report.label);
console.log('Issues:', report.issues.length);
for (const i of report.issues.slice(0, 8)) {
  console.log('  [' + i.severity + '] ' + i.title + ' — ' + (i.locationLabel || ''));
}
