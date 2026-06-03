import app from './dist/server/server.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const clientDir = path.resolve('./dist/client');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);

    // Serve static files from dist/client
    const filePath = path.join(clientDir, decodeURIComponent(urlObj.pathname));

    if (filePath.startsWith(clientDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SSR handler
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
      duplex: 'half',
    });

    const response = await app.fetch(request, process.env, {});

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await response.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
});