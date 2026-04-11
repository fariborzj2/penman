import { spawn } from 'child_process';
import fetch from 'node-fetch';

async function waitForServer(url, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await fetch(url);
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

const serverProcess = spawn('npx', ['vite', '--port', '3000'], {
  stdio: 'inherit',
  shell: true
});

(async () => {
  console.log('Waiting for Vite server to start...');
  const isUp = await waitForServer('http://localhost:3000');

  if (!isUp) {
    console.error('Failed to start Vite server.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Server is up! Running Playwright E2E tests...');

  const testProcess = spawn('python3', ['verify_ui.py'], {
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (code) => {
    console.log(`Playwright test exited with code ${code}`);
    serverProcess.kill();
    process.exit(code);
  });
})();
