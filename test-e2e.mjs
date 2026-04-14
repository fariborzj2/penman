import { spawn } from 'child_process';
import { exec } from 'child_process';

console.log('Starting Vite server...');
const viteProcess = spawn('npx', ['vite', '--port', '5173'], { stdio: 'pipe' });

let isViteReady = false;
let activePort = '5173';

viteProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Vite] ${output.trim()}`);

  const portMatch = output.match(/http:\/\/localhost:(\d+)\//);
  if (portMatch) {
     activePort = portMatch[1];
  }

  if (output.includes('Local:')) {
    if (!isViteReady) {
      isViteReady = true;
      runPlaywright(activePort); // wait for actual port
    }
  }
});

viteProcess.stderr.on('data', (data) => {
  console.error(`[Vite Error] ${data}`);
});

function runPlaywright(port) {
  console.log(`Vite is ready on port ${port}. Running Playwright tests...`);

  exec(`VITE_PORT=${port} python3 verify_ui.py`, (error, stdout, stderr) => {
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

process.on('SIGINT', () => cleanup(1));
process.on('SIGTERM', () => cleanup(1));
