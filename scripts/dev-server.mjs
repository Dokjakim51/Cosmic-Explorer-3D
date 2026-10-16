import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, relative, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const getArgument = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const port = Number(getArgument('--port', process.env.PORT ?? 5173));
const root = resolve(getArgument('--root', '.'));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg; codecs=opus', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json'
};

function safePath(urlPath) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(urlPath ?? '/', 'http://localhost').pathname); }
  catch { return null; }
  const candidate = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const rel = relative(root, candidate);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(candidate) === resolve(root, '..')) return null;
  return candidate;
}

function commonHeaders(contentType, size) {
  return {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Content-Length': String(size),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };
}

function sendFile(request, response, filePath) {
  const info = statSync(filePath);
  const type = mimeTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); response.end(); return;
    }
    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : info.size - 1;
    if (!match[1] && match[2]) { const suffix = Number(match[2]); start = Math.max(0, info.size - suffix); end = info.size - 1; }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= info.size) {
      response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); response.end(); return;
    }
    end = Math.min(end, info.size - 1);
    response.writeHead(206, {
      ...commonHeaders(type, end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${info.size}`
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, commonHeaders(type, info.size));
  if (request.method === 'HEAD') response.end();
  else createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  if (!['GET','HEAD'].includes(request.method ?? 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method Not Allowed'); return;
  }
  let filePath = safePath(request.url);
  if (!filePath) { response.writeHead(403); response.end('Forbidden'); return; }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = resolve(filePath, 'index.html');
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8', 'X-Content-Type-Options':'nosniff' });
    response.end('Not Found');
    return;
  }
  sendFile(request, response, filePath);
});

function getLocalAddresses() {
  const addresses = [];
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) {
    if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address);
  }
  return addresses;
}

server.listen(port, '0.0.0.0', () => {
  const threeModule = resolve(root, 'node_modules/three/build/three.module.js');
  if (!existsSync(threeModule)) console.warn('Three.js is missing. Run `npm ci` before reviewing 3D routes.');
  console.log(`Cosmic Explorer local:   http://127.0.0.1:${port}`);
  for (const address of getLocalAddresses()) console.log(`Cosmic Explorer network: http://${address}:${port}`);
  console.log(`Serving: ${root}`);
});
