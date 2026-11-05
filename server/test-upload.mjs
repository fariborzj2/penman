import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'penman-upload-test-'));
const port = 31000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [new URL('./server.js', import.meta.url).pathname], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', BASE_URL: origin, UPLOAD_DIR: uploadDir },
  stdio: 'ignore',
});

async function post(bytes, name, type) {
  const form = new FormData();
  form.set('file', new Blob([bytes], { type }), name);
  return fetch(`${origin}/upload`, { method: 'POST', body: form });
}

try {
  for (let i = 0; i < 50; i++) {
    try {
      const health = await fetch(`${origin}/gallery`);
      if (health.ok) break;
    } catch { /* wait for server */ }
    await new Promise(resolve => setTimeout(resolve, 100));
    if (i === 49) throw new Error('server did not start');
  }

  const php = Buffer.from('<?php echo "PENMAN_TEST_MARKER"; ?>');
  const fake = await post(php, 'shell.png', 'image/png');
  assert.equal(fake.status, 400);
  const svg = await post(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'a.svg', 'image/svg+xml');
  assert.equal(svg.status, 400);
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
  const polyglot = await post(Buffer.concat([png, php]), 'shell.php', 'image/png');
  assert.equal(polyglot.status, 200);
  const { url } = await polyglot.json();
  assert.match(url, /\/uploads\/[a-f0-9]{32}\.webp$/);
  const served = await fetch(url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  const output = Buffer.from(await served.arrayBuffer());
  assert.equal((await sharp(output).metadata()).format, 'webp');
  assert.equal(output.includes(php), false);
  assert.equal((await fetch(`${origin}/uploads/shell.php`)).status, 404);
  const gallery = await (await fetch(`${origin}/gallery`)).json();
  assert.equal(gallery.items.length, 1);
  assert.equal((await fs.readdir(uploadDir)).length, 1);
  console.log('Upload security checks passed');
} finally {
  server.kill();
  await fs.rm(uploadDir, { recursive: true, force: true });
}
