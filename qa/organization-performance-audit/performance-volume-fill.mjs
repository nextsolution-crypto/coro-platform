#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const api = String(process.env.CORO_QA_BACKEND_URL || '').replace(/\/$/, '');
const sessions = JSON.parse(await readFile(process.env.CORO_QA_SESSION_CHECKPOINT, 'utf8'));
const ids = JSON.parse(await readFile(process.env.CORO_QA_ACTOR_FILE, 'utf8'));
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(api)) throw new Error('Loopback QA API required.');
const token = sessions.advisor.access_token;
const target = 1001;
const batchSize = 90;
const normalWindowMs = 61_000;

async function call(method, route, body) {
  const response = await fetch(`${api}${route}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, retryAfter: response.headers.get('retry-after') };
}
async function state() {
  const tasks = await call('GET', `/projects/${ids.projectA}/tasks`);
  const task = Array.isArray(tasks.data) && tasks.data.find((row) => row.taskTitle === 'Volume 1001 entries');
  if (!task) throw new Error('Volume task missing.');
  const sheet = await call('GET', `/projects/${ids.projectA}/timesheet?from=2027-01-01&to=2027-01-31`);
  if (sheet.status !== 200) throw new Error(`Volume reconciliation failed HTTP ${sheet.status}`);
  return { task, count: sheet.data.entries.filter((row) => row.note === 'Rendement volume 1001').length };
}

let current = await state();
while (current.count < target) {
  const wanted = Math.min(batchSize, target - current.count);
  let accepted = 0;
  let throttled = false;
  for (let index = 0; index < wanted; index += 1) {
    const result = await call('POST', `/projects/${ids.projectA}/tasks/${current.task.id}/time`, { date: '2027-01-15', heures: '0.1', note: 'Rendement volume 1001' });
    if (result.status === 201) accepted += 1;
    else if (result.status === 429) { throttled = true; break; }
    else throw new Error(`Volume creation failed HTTP ${result.status}`);
  }
  current = await state().catch(() => ({ ...current, count: current.count + accepted }));
  console.log(JSON.stringify({ acceptedThisWindow: accepted, reconciledCount: current.count, target, throttled, retryAfter: throttled ? 'not-supplied; normal-60s-window' : null }));
  if (current.count < target) await new Promise((resolve) => setTimeout(resolve, normalWindowMs));
  current = await state();
}
console.log(JSON.stringify({ status: 'COMPLETE', reconciledCount: current.count, target }));
