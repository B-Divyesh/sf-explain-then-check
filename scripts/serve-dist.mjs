import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('dist');
const configuration = JSON.parse(await readFile(resolve(root, 'staticwebapp.config.json'), 'utf8'));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function matches(pattern, pathname) {
  if (pattern === '/*') return true;
  if (pattern.endsWith('/*')) return pathname.startsWith(pattern.slice(0, -1));
  return pathname === pattern;
}

function pathFor(pathname) {
  const route = configuration.routes.find((item) => item.rewrite && matches(item.route, pathname));
  if (route?.rewrite) return { file: route.rewrite, status: 200 };
  const directoryPath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const candidate = resolve(root, '.' + directoryPath);
  if (!candidate.startsWith(root)) return { file: '/404.html', status: 404 };
  return { file: directoryPath, status: 200 };
}

function headersFor(pathname) {
  const headers = { ...configuration.globalHeaders };
  const route = configuration.routes.find((item) => item.headers && matches(item.route, pathname));
  return { ...headers, ...(route?.headers ?? {}) };
}

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  let target = pathFor(pathname);
  let file = resolve(root, '.' + target.file);
  try {
    const info = await stat(file);
    if (info.isDirectory()) { file = resolve(file, 'index.html'); }
  } catch {
    target = { file: '/404.html', status: 404 };
    file = resolve(root, '.', '404.html');
  }
  try {
    const body = await readFile(file);
    const contentType = types[extname(file)] || 'application/octet-stream';
    response.writeHead(target.status, { ...headersFor(pathname), 'Content-Type': contentType }).end(body);
  } catch {
    response.writeHead(500, headersFor(pathname)).end('Server could not read the production artifact.');
  }
});

server.listen(port, host, () => {
  process.stdout.write('Serving dist at http://' + host + ':' + port + '\n');
});
