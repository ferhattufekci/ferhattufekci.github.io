// Development/test utility only. GitHub Pages serves the production files.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';
import { ROOT } from './public-files.mjs';

export function createPagesServer(root = ROOT) {
  const base = resolve(root);
  const types = { '.html':'text/html; charset=utf-8', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.xml':'application/xml', '.pdf':'application/pdf', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.eot':'application/vnd.ms-fontobject' };
  return http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end(); }
    const absolute = resolve(base, '.' + path);
    let status = 200, file = absolute;
    try {
      if (!absolute.startsWith(base + sep) && absolute !== base) throw new Error('Outside root');
      if (path.split('/').some(part => part.startsWith('.') && part !== '.well-known')) throw new Error('Private path');
      const info = await stat(file);
      if (info.isDirectory()) {
        if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' }); return res.end(); }
        file = join(file, 'index.html');
      }
      const body = await readFile(file);
      res.writeHead(status, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      status = 404;
      const body = await readFile(join(base, '404.html')).catch(() => Buffer.from('<h1>404 — Page Not Found</h1>'));
      res.writeHead(status, { 'Content-Type':'text/html; charset=utf-8', 'Content-Length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    }
  });
}

export async function listen(server) {
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
export async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
