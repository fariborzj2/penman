import { LinkChecker } from './src/plugins/ContentAuditPlugin/linkChecker.js';

// Mock fetch — returns various status codes based on URL
global.fetch = async (url) => {
  if (url.includes('500-error')) return { status: 500, ok: false, type: 'cors' };
  if (url.includes('404-notfound')) return { status: 404, ok: false, type: 'cors' };
  if (url.includes('ok-page')) return { status: 200, ok: true, type: 'cors' };
  if (url.includes('cors-blocked')) { const e = new Error('CORS error'); e.name = 'TypeError'; throw e; }
  if (url.includes('timeout')) { return await new Promise((_, rej) => setTimeout(() => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); }, 50)); }
  throw new Error('Network unreachable');
};
global.AbortController = class { constructor() { this.signal = {}; } abort() {} };
global.URL = URL;

const checker = new LinkChecker({ timeout: 1000, concurrency: 2 });

const cases = [
  ['https://example.com/ok-page',     'ok'],
  ['https://example.com/404-notfound', 'broken'],
  ['https://example.com/500-error',   'broken'],
  ['https://example.com/cors-blocked', 'cors'],
  ['https://example.com/unreachable',  'network'],
  ['http://localhost/ok-page',         'ok'],
  ['not-a-url',                        'invalid'],
];

console.log('Results:');
for (const [url, expected] of cases) {
  const result = await checker.check(url);
  const pass = result.state === expected;
  console.log('  ' + (pass ? '✓' : '✗') + ' ' + url + ' → state=' + result.state + ', status=' + result.status + (pass ? '' : ' (expected ' + expected + ')'));
}

console.log('\nCache reuse test:');
const before = Date.now();
await checker.check('https://example.com/ok-page'); // cached now
const elapsed = Date.now() - before;
console.log('  Repeated check completed in ' + elapsed + 'ms (should be ~0ms from cache)');
