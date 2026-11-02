#!/usr/bin/env node
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const api = String(process.env.CORO_QA_BACKEND_URL || '').replace(/\/$/, '');
const checkpoint = process.env.CORO_QA_SESSION_CHECKPOINT;
const mfaDir = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(api) || !checkpoint || !mfaDir || !password) throw new Error('Isolated QA runtime required.');
const email = 'advisor-a@global-e2e.test';
async function call(route, body) {
  const response = await fetch(`${api}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text(); let data = text; try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, retryAfter: response.headers.get('retry-after') };
}
async function code(after) {
  const files = await Promise.all((await readdir(mfaDir)).map(async (name) => ({ name, at: (await stat(join(mfaDir, name))).mtimeMs })));
  for (const file of files.sort((a, b) => b.at - a.at)) {
    if (file.at < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDir, file.name), 'utf8'));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error('Local MFA capture missing.');
}
const started = Date.now(); const first = await call('/auth/login', { email, password });
if (first.status === 429) throw new Error(`THROTTLED retry-after=${first.retryAfter || 'not-supplied'}`);
if (first.status >= 300 || first.data?.mfaRequired !== true) throw new Error(`MFA required failed HTTP ${first.status}`);
const verified = await call('/auth/verify-mfa', { email, code: await code(started) });
if (verified.status >= 300 || !verified.data?.access_token) throw new Error(`MFA verification failed HTTP ${verified.status}`);
const sessions = JSON.parse(await readFile(checkpoint, 'utf8'));
sessions.advisor = verified.data;
await writeFile(checkpoint, JSON.stringify(sessions));
console.log(JSON.stringify({ actor: 'advisor', mfa: 'LOCAL', status: 'SESSION_REFRESHED' }));
