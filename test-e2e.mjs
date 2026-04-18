import { spawn } from 'child_process';
import { createServer } from 'vite';

async function runE2E() {
  let viteServer;
  let backendServer;

  try {
    // Start Backend Server
    backendServer = spawn('node', ['server/server.js'], { stdio: 'pipe' });
    backendServer.stdout.on('data', (data) => console.log(`[Backend] ${data.toString().trim()}`));
    backendServer.stderr.on('data', (data) => console.error(`[Backend Error] ${data.toString().trim()}`));

    // Start Vite Server
    viteServer = await createServer({
      server: { port: 0 }, // Let Vite pick an available port
    });

    await viteServer.listen();
    const port = viteServer.config.server.port;
    console.log(`Vite server started on port ${port}`);

    // Wait a brief moment for the backend to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run Playwright Tests
    const py = spawn('python3', ['verify_ui.py'], {
      env: { ...process.env, VITE_PORT: port.toString() },
      stdio: 'inherit'
    });

    py.on('close', (code) => {
      viteServer.close();
      if (backendServer) backendServer.kill();

      if (code !== 0) {
        console.error(`Playwright tests failed with exit code ${code}`);
        process.exit(code);
      } else {
        console.log('Playwright E2E tests completed successfully.');
        process.exit(0);
      }
    });

  } catch (err) {
    console.error('Failed to start servers or run E2E tests:', err);
    if (viteServer) viteServer.close();
    if (backendServer) backendServer.kill();
    process.exit(1);
  }
}

runE2E();
