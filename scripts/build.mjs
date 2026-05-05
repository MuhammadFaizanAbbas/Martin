import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const entriesToCopy = [
  'index.html',
  'style.css',
  'js',
];

async function main() {
  await mkdir(DIST_DIR, { recursive: true });

  for (const entry of entriesToCopy) {
    await cp(path.join(ROOT_DIR, entry), path.join(DIST_DIR, entry), {
      force: true,
      recursive: true,
    });
  }

  console.log(`Static build complete: ${DIST_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
