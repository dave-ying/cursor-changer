import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  resolve: {
    alias: {
      '@tauri-apps/api/tauri': resolve(rootDir, 'test/stubs/tauri-module.js')
    }
  },
  test: {
    globals: true,
    environment: 'node', // Changed from jsdom to node to avoid JSDOM complexity
    setupFiles: [resolve(rootDir, 'test/setup.js')],
    include: ['test/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/target/**', '**/.{idea,git,cache,output,temp}/**'],
    watchExclude: ['**/dist/**', '**/target/**'],
    passWithNoTests: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'istanbul',
      all: true,
      include: ['src/**/*.js'],
      exclude: ['dist/**'],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      extension: ['.js']
    },
    // Add jest-style aliases
    aliases: {
      describe: 'suite',
      it: 'test',
      beforeEach: 'setup',
      afterEach: 'teardown',
      beforeAll: 'suiteSetup',
      afterAll: 'suiteTeardown'
    }
  }
});
