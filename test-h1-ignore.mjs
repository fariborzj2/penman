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

// Body content that starts with H2 (typical CMS pattern with title in separate input)
const root = document.createElement('div');
root.innerHTML = '<h2>Introduction</h2><p>Some body text here.</p><h3>Subsection</h3><p>More content.</p>';
document.body.appendChild(root);

// 1) Default behaviour — H1 rules ACTIVE
console.log('── DEFAULT (H1 rules active) ──');
const engine1 = new AuditEngine(defaultRules);
const report1 = engine1.analyze(root);
const h1Issues1 = report1.issues.filter(i => ['seo-no-h1', 'seo-multiple-h1', 'seo-h1-too-long'].includes(i.ruleId));
console.log('H1-related issues:', h1Issues1.map(i => i.ruleId));
console.log('Total issues:', report1.issues.length);

// 2) With auditIgnoreH1
console.log('\n── WITH auditIgnoreH1: true ──');
const H1_RULE_IDS = ['seo-no-h1', 'seo-multiple-h1', 'seo-h1-too-long'];
const filtered = defaultRules.filter(r => !H1_RULE_IDS.includes(r.id));
const engine2 = new AuditEngine(filtered);
const report2 = engine2.analyze(root);
const h1Issues2 = report2.issues.filter(i => ['seo-no-h1', 'seo-multiple-h1', 'seo-h1-too-long'].includes(i.ruleId));
console.log('H1-related issues:', h1Issues2.map(i => i.ruleId));
console.log('Total issues:', report2.issues.length);

// 3) Verify auditDisabledRules works
console.log('\n── WITH auditDisabledRules: ["read-long-paragraph"] ──');
const filtered3 = defaultRules.filter(r => !['read-long-paragraph'].includes(r.id));
const engine3 = new AuditEngine(filtered3);
const report3 = engine3.analyze(root);
const hasLongPara = report3.issues.some(i => i.ruleId === 'read-long-paragraph');
console.log('long-paragraph rule present in active rules:', engine3.rules.some(r => r.id === 'read-long-paragraph'));
console.log('long-paragraph issues raised:', hasLongPara);
