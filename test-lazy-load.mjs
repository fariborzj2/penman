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
const s = new Sanitizer();

const cases = [
  {
    label: 'img with loading=lazy + decoding=async + fetchpriority',
    input: '<p><img src="/x.jpg" alt="x" loading="lazy" decoding="async" fetchpriority="low"></p>',
    mustContain: ['loading="lazy"', 'decoding="async"', 'fetchpriority="low"'],
  },
  {
    label: 'figure>img with lazy attributes (realistic ImagePlugin output)',
    input: '<figure class="penman-image" data-alignment="center" contenteditable="false"><div class="penman-image-wrapper"><img src="/x.jpg" alt="cat" loading="lazy" decoding="async"></div><figcaption class="penman-image-caption" contenteditable="true"></figcaption></figure>',
    mustContain: ['loading="lazy"', 'decoding="async"'],
  },
  {
    label: 'figure>iframe with loading=lazy (realistic EmbedPlugin output)',
    input: '<figure class="penman-media-block" data-penman-core="true" contenteditable="false"><div class="penman-media-wrapper"><iframe src="https://www.youtube.com/embed/x" loading="lazy" title="yt"></iframe></div></figure>',
    mustContain: ['loading="lazy"'],
  },
  {
    label: 'figure>video with preload=metadata',
    input: '<figure class="penman-media-block" data-penman-core="true" contenteditable="false"><div class="penman-media-wrapper"><video src="/vid.mp4" controls preload="metadata"></video></div></figure>',
    mustContain: ['preload="metadata"'],
  },
  {
    label: 'figure>audio with preload=none',
    input: '<figure class="penman-media-block" data-penman-core="true" contenteditable="false"><div class="penman-media-wrapper"><audio src="/a.mp3" controls preload="none"></audio></div></figure>',
    mustContain: ['preload="none"'],
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const out = s.sanitize(c.input);
  const okAll = c.mustContain.every(needle => out.includes(needle));
  if (okAll) { pass++; console.log('✓ ' + c.label); }
  else {
    fail++;
    console.log('✗ ' + c.label);
    console.log('  output: ' + out);
    console.log('  expected: ' + c.mustContain.join(', '));
  }
}
console.log('\nPASS ' + pass + '/' + cases.length);
