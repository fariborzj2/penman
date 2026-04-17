import { spawn } from 'child_process';
import { createServer } from 'vite';

async function runE2E() {
  let server;
  try {
    server = await createServer({
      server: { port: 0 }, // Let Vite pick an available port
    });

    await server.listen();
    const port = server.config.server.port;
    console.log(`Vite server started on port ${port}`);

    const py = spawn('python3', ['verify_ui.py'], {
      env: { ...process.env, VITE_PORT: port.toString() },
      stdio: 'inherit'
    });

    py.on('close', (code) => {
      server.close();
      if (code !== 0) {
        console.error(`Playwright tests failed with exit code ${code}`);
        process.exit(code);
      } else {
        console.log('Playwright E2E tests completed successfully.');
        process.exit(0);
      }
    });

  } catch (err) {
    console.error('Failed to start Vite server or run E2E tests:', err);
    if (server) {
        server.close();
    }
    process.exit(1);
  }
}

runE2E();
