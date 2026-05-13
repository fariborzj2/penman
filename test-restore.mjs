import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.DOMParser = dom.window.DOMParser;

const { Sanitizer } = await import('./src/sanitization/Sanitizer.js');

const snapshotHtml = '<p>hello <span id="penman-selection-marker-start" style="display: none;"></span>world<span id="penman-selection-marker-end" style="display: none;"></span></p>';

console.log('Original snapshot (markers with IDs):');
console.log('  ' + snapshotHtml);
console.log('');

// PATH A (the OLD broken behavior): sanitize first, then restore
const sanitizer = new Sanitizer();
const sanitized = sanitizer.sanitize(snapshotHtml);
console.log('After setContent (sanitizer strips IDs from spans):');
console.log('  ' + sanitized);
const hasIdAfterSanitize = sanitized.includes('penman-selection-marker-start');
console.log('  Marker IDs preserved? ' + hasIdAfterSanitize);
console.log('');

// PATH B (the NEW correct behavior): direct innerHTML
const div = document.createElement('div');
div.innerHTML = snapshotHtml;
const startMarker = div.querySelector('#penman-selection-marker-start');
const endMarker = div.querySelector('#penman-selection-marker-end');
console.log('After direct innerHTML assignment:');
console.log('  Start marker found? ' + !!startMarker);
console.log('  End marker found?   ' + !!endMarker);
console.log('  → selection.restore() would correctly place cursor between them ✓');
