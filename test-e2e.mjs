import { spawn } from 'child_process';
import { exec } from 'child_process';

const URL = 'http://localhost:5173';

console.log('Starting Vite server...');
const viteProcess = spawn('npx', ['vite', '--port', '5173'], { stdio: 'pipe' });

let isViteReady = false;

viteProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Vite] ${output.trim()}`);

  if (output.includes('ready in') || output.includes(URL)) {
    if (!isViteReady) {
      isViteReady = true;
      runPlaywright();
    }
  }
});

viteProcess.stderr.on('data', (data) => {
  console.error(`[Vite Error] ${data}`);
});

function runPlaywright() {
  console.log('Vite is ready. Running Playwright tests...');

  exec('python3 verify_ui.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`[Playwright Error] ${error.message}`);
      cleanup(1);
      return;
    }
    if (stderr) {
      console.warn(`[Playwright Stderr] ${stderr}`);
    }
    console.log(`[Playwright Output]\n${stdout}`);
    cleanup(0);
  });
}

function cleanup(exitCode) {
  console.log('Cleaning up processes...');
  viteProcess.kill();
  process.exit(exitCode);
}

// Ensure cleanup on unexpected exits
process.on('SIGINT', () => cleanup(1));
process.on('SIGTERM', () => cleanup(1));
