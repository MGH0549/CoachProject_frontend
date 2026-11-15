import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, sep, extname } from 'node:path';
const root = resolve('dist/coaching-platform/browser');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const info = await stat(file);
      if (info.isDirectory()) file = join(file, 'index.html');
      await stat(file);
    } catch {
      if (extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      file = join(root, 'index.csr.html');
    }
    const content = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4300, '127.0.0.1', () => console.log('Static preview: http://localhost:4300'));
