#!/usr/bin/env node
import { createServer } from 'node:http';

const port = Number(process.env.PORT || 34682);
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=',
  'base64',
);
const state = { imageRequests: 0 };

createServer((request, response) => {
  if (request.url === '/state') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(state));
    return;
  }
  if (request.url === '/synthetic.png') {
    state.imageRequests += 1;
    response.writeHead(200, {
      'content-type': 'image/png',
      'content-length': String(png.length),
      'cache-control': 'no-store',
    });
    response.end(png);
    return;
  }
  response.writeHead(404).end();
}).listen(port, '0.0.0.0');
