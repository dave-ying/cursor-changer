#!/usr/bin/env node
const net = require('net');
const cp = require('child_process');
const path = require('path');

const PORT = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173;
const HOST = '127.0.0.1';

function isPortOpen(port, host) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(1000);
    s.once('error', () => {
      resolve(false);
    });
    s.once('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, host, () => {
      s.end();
      resolve(true);
    });
  });
}

(async () => {
  try {
    const open = await isPortOpen(PORT, HOST);
    if (open) {
      console.log(`Vite already running on ${HOST}:${PORT} — skipping start.`);
      process.exit(0);
    }

    console.log(`Starting frontend (port ${PORT})...`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = cp.spawn(npmCmd, ['--prefix', 'frontend-vite', 'run', 'dev'], { stdio: 'inherit', shell: false });

    child.on('exit', (code) => process.exit(code));
    child.on('error', (err) => {
      console.error('Failed to start frontend dev server:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
