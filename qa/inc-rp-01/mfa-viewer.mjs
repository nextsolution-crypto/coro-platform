import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(process.env.MFA_QA_CAPTURE_DIR || '');
if (!directory) throw new Error('MFA_QA_CAPTURE_DIR is required.');

createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  if (request.url !== '/') { response.writeHead(404).end('Not found'); return; }
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort().reverse();
  const messages = await Promise.all(files.slice(0, 10).map(async name => JSON.parse(await readFile(resolve(directory, name), 'utf8'))));
  const rows = messages.map(message => `<li><strong>${String(message.to).replaceAll('<', '&lt;')}</strong> — ${String(message.subject).replaceAll('<', '&lt;')}</li>`).join('');
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><meta http-equiv="refresh" content="3"><title>MFA QA</title><style>body{font:18px system-ui;margin:3rem;max-width:60rem}li{margin:1rem 0}</style><h1>Codes MFA synthétiques</h1><p>Local uniquement · actualisation automatique · aucune donnée réelle.</p><ul>${rows}</ul>`);
}).listen(3099, '127.0.0.1', () => console.log('MFA_QA_VIEWER=http://127.0.0.1:3099'));
