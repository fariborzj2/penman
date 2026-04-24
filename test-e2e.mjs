/**
 * test-e2e.mjs — یکپارچه‌سازی زیرساخت تست E2E
 *
 * اصلاح‌شده: سرور Node.js (server/server.js روی پورت 3000) اکنون به صورت
 * موازات Vite اجرا می‌شود. این حذف نیاز به page.route() Mock در verify_ui.py
 * را برای تست‌های آپلود و گالری ممکن می‌سازد.
 */

import { spawn } from 'child_process';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** یک پروسه را اجرا کرده و منتظر می‌ماند تا یک رشته مشخص در stdout/stderr ظاهر شود */
function spawnAndWaitForOutput(cmd, args, opts, waitForStr, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`Process "${cmd} ${args.join(' ')}" did not output "${waitForStr}" within ${timeoutMs}ms`));
    }, timeoutMs);

    const check = (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes(waitForStr)) {
        clearTimeout(timeout);
        resolve(proc);
      }
    };

    proc.stdout.on('data', check);
    proc.stderr.on('data', check);

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function runE2E() {
  let viteServer = null;
  let backendProc = null;

  // cleanup در صورت خروج
  const cleanup = async () => {
    if (backendProc) {
      backendProc.kill();
      backendProc = null;
    }
    if (viteServer) {
      await viteServer.close().catch(() => {});
      viteServer = null;
    }
  };

  process.on('SIGINT', async () => { await cleanup(); process.exit(1); });
  process.on('SIGTERM', async () => { await cleanup(); process.exit(1); });

  try {
    // ── مرحله ۱: اجرای سرور backend (server/server.js) ──────────────────────
    console.log('[E2E] Starting backend server (port 3000)...');
    backendProc = await spawnAndWaitForOutput(
      'node',
      [join(__dirname, 'server', 'server.js')],
      { cwd: __dirname },
      'Server running on http://localhost:3000',
      10000
    );
    console.log('[E2E] Backend server ready.');

    // ── مرحله ۲: اجرای Vite dev server ──────────────────────────────────────
    console.log('[E2E] Starting Vite dev server...');
    viteServer = await createServer({
      root: __dirname,
      server: { port: 0 },   // پورت خودکار برای جلوگیری از conflict
      logLevel: 'warn',
    });
    await viteServer.listen();
    const vitePort = viteServer.config.server.port;
    console.log(`[E2E] Vite server ready on port ${vitePort}`);

    // ── مرحله ۳: اجرای Playwright ────────────────────────────────────────────
    console.log('[E2E] Running Playwright tests (verify_ui.py)...');
    const py = spawn('python3', [join(__dirname, 'verify_ui.py')], {
      env: {
        ...process.env,
        VITE_PORT: String(vitePort),
        BACKEND_PORT: '3000',       // برای استفاده در verify_ui.py
      },
      stdio: 'inherit',
      cwd: __dirname,
    });

    let exitCode = await new Promise((resolve) => {
      py.on('close', resolve);
    });


    await cleanup();

    if (exitCode !== 0) {
      console.error(`[E2E] Playwright tests failed with exit code ${exitCode}`);
      process.exit(exitCode);
    }

    console.log('[E2E] All Playwright E2E tests passed successfully.');
    process.exit(0);

  } catch (err) {
    console.error('[E2E] Fatal error:', err.message);
    await cleanup();
    process.exit(1);
  }
}

runE2E();
