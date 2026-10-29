import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

/**
 * Creates and configures the HTTP server for serving graph visualization files.
 * Injects Referrer-Policy: origin-when-cross-origin to comply with OSM tile usage policy.
 *
 * @returns {http.Server} Configured HTTP server instance
 */
export function createGraphServer() {
  return http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const safeSubPath = path.normalize(decodeURIComponent(reqUrl.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
    const relativePath = safeSubPath === '/' || safeSubPath === '\\' ? 'index.html' : safeSubPath.replace(/^[/\\]+/, '');
    const filePath = path.join(ROOT_DIR, relativePath);

    if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Referrer-Policy': 'origin-when-cross-origin',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  const host = process.env.HOST || 'localhost';
  const server = createGraphServer();
  server.listen(port, host, () => {
    console.log(`Server peta berjalan di http://${host}:${port}`);
  });
}
