import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;

const { captureAtomicSnapshot, captureCompletionSnapshot } = await import('./src/plugins/ImagePlugin/history/snapshotController.js');

let changeEvents = 0;
const fakeEditor = {
  history: { pushImmediate: () => {} },
  emit: (name, payload) => { if (name === 'change') changeEvents++; },
  getContent: () => '<figure>fake</figure>',
  _syncToTextarea: () => {},
};

captureAtomicSnapshot(fakeEditor);
captureCompletionSnapshot(fakeEditor, 'id-1');
console.log('change events emitted:', changeEvents, '(expected: 2)');
console.log(changeEvents === 2 ? '✓ PASS' : '✗ FAIL');

console.log('');
console.log('=== Test 2: MarkdownPlugin yields to magic-paste for URL on selection ===');

// Simulate the guard logic
function shouldYieldToMagicPaste(text, hasSelection, selectedNode) {
  if (!text) return false;
  const looksLikeUrl = /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
  return (hasSelection || selectedNode) && looksLikeUrl;
}

const cases = [
  // [text,           hasSel, selNode, expectedYield]
  ['https://x.com',   true,   null,    true,  'URL on text selection → yield'],
  ['hello',           true,   null,    false, 'Plain text on selection → no yield'],
  ['https://x.com',   false,  null,    false, 'URL with no selection → no yield (normal paste)'],
  ['https://x.com',   false,  {},      true,  'URL with selected widget → yield'],
  ['www.example.com', true,   null,    true,  'www URL → yield'],
];

let p = 0, f = 0;
for (const [text, hasSel, selNode, expected, label] of cases) {
  const got = shouldYieldToMagicPaste(text, hasSel, selNode);
  if (got === expected) { p++; console.log('  ✓ ' + label); }
  else { f++; console.log('  ✗ ' + label + ' (expected ' + expected + ', got ' + got + ')'); }
}
console.log('\nPASS ' + p + '/' + cases.length);
