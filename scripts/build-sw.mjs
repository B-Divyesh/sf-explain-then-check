import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]));
  return nested.flat();
}

const root = 'dist';
const paths = (await files(root))
  .filter((path) => !path.endsWith('.map') && !path.endsWith('/sw.js'))
  .map((path) => `/${relative(root, path).replaceAll('\\', '/')}`)
  .map((path) => path.endsWith('/index.html') ? path.slice(0, -10) : path === '/index.html' ? '/' : path);
const swPath = join(root, 'sw.js');
const source = await readFile(swPath, 'utf8');
const precache = [...new Set(paths)];
const version = `etc-${createHash('sha256').update(JSON.stringify(precache)).digest('hex').slice(0, 12)}`;
await writeFile(swPath, source
  .replace("const VERSION = 'etc-v1';", `const VERSION = '${version}';`)
  .replace("self.__PRECACHE__ || ['/', '/offline.html', '/manifest.webmanifest']", JSON.stringify(precache)));
