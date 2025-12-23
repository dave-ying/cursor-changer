#!/usr/bin/env node
const net = require('net');
const cp = require('child_process');
const path = require('path');

const PORT = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173;
const HOST = '127.0.0.1';

const http = require('http');

function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.request({ method: 'GET', hostname: '127.0.0.1', port, path: '/', timeout: 1000 }, (res) => {
      resolve(true);
      req.destroy();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
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

    const child = cp.spawn('npm --prefix frontend-vite run dev', { stdio: 'inherit', shell: true });

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
