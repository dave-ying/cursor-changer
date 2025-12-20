import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createInstrumenter } from 'istanbul-lib-instrument';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..', '..');
const instrumenter = createInstrumenter({ coverageVariable: '__coverage__' });
const cache = new Map();
let tempDirPromise;

async function ensureTempDir() {
  if (!tempDirPromise) {
    tempDirPromise = mkdtemp(join(tmpdir(), 'vitest-dist-'));
  }
  return tempDirPromise;
}

export async function importInstrumented(relativePath) {
  const absPath = resolve(rootDir, relativePath);
  let instrumentedPath = cache.get(absPath);
  if (!instrumentedPath) {
    const source = await readFile(absPath, 'utf-8');
    const instrumented = instrumenter.instrumentSync(source, absPath);
    const dir = await ensureTempDir();
    const fileName = Buffer.from(absPath).toString('hex') + '.mjs';
    instrumentedPath = join(dir, fileName);
    await writeFile(instrumentedPath, instrumented, 'utf-8');
    cache.set(absPath, instrumentedPath);
  }

  return import(pathToFileURL(instrumentedPath).href);
}
