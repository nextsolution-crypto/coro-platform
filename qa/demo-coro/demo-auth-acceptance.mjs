#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { assertUnderQaRoot, assertLocalUrl } from '../global-e2e/src/policy.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { PrismaClient } from '../../coro-backend/node_modules/@prisma/client/default.js';
import { demoActors, resetDemoIdentities } from './demo-identity-lab.mjs';

const apiUrl = assertLocalUrl(process.env.CORO_DEMO_QA_BACKEND_URL, 'CORO_DEMO_QA_BACKEND_URL').href.replace(/\/$/, '');
const captureDirectory = resolve(process.env.CORO_QA_MFA_DIR);
const output = assertUnderQaRoot(resolve(process.env.CORO_DEMO_AUTH_EVIDENCE || 'D:\\CORO-QA\\tracking\\demo-coro\\auth-acceptance.json'));
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory, channelToken: secrets.mfaChannelToken });

const delay = (ms) => new Promise((done) => setTimeout(done, ms));
async function call(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

async function mfaCode(actor, after) {
  const url = new URL(`${adapter.url}/challenge`);
  url.searchParams.set('recipient', actor.email);
  url.searchParams.set('after', String(after));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(url, { headers: { authorization: `Bearer ${secrets.mfaChannelToken}` } });
    if (response.status === 200) return (await response.json()).code;
    if (response.status !== 404) throw new Error(`MFA_CAPTURE_${response.status}`);
    await delay(100);
  }
  throw new Error(`MFA_TIMEOUT_${actor.email}`);
}

async function login(actor) {
  const prefix = actor.kind === 'portal' ? '/client-auth' : '/auth';
  const startedAt = Date.now();
  const start = await call(`${prefix}/login`, { method: 'POST', body: { email: actor.email, password: secrets.syntheticPassword } });
  if (start.status >= 300 || start.data?.mfaRequired !== true) throw new Error(`LOGIN_PREFLIGHT_${actor.email}_${start.status}`);
  const code = await mfaCode(actor, startedAt);
  const verified = await call(`${prefix}/verify-mfa`, { method: 'POST', body: { email: actor.email, code } });
  if (verified.status >= 300) throw new Error(`MFA_VERIFY_${actor.email}_${verified.status}`);
  const token = actor.kind === 'portal' ? verified.data?.token : verified.data?.access_token;
  if (!token || verified.data?.user?.role !== actor.role) throw new Error(`AUTHORITY_MISMATCH_${actor.email}`);
  return { token, user: verified.data.user, status: verified.status };
}

function rows(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['items', 'projects', 'data']) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

const report = { executedAt: new Date().toISOString(), environment: 'LOCAL_QA_ONLY', actors: {}, checks: [] };
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(id);
};

try {
  const sessions = {};
  for (const [key, actor] of Object.entries(demoActors)) {
    const session = await login(actor);
    sessions[key] = session;
    report.actors[key] = { role: session.user.role, organizationId: session.user.organizationId, mfa: 'NORMAL_LOCAL_CAPTURE' };
    check(`${key}-organization`, session.user.organizationId === '916f54ec-af22-45e0-99db-a369d9630002', 'canonical demo tenant');
    const listing = await call(actor.kind === 'portal' ? '/client-portal/projects' : '/projects', { token: session.token });
    const projects = rows(listing.data);
    check(`${key}-listing`, listing.status === 200 && projects.length > 0, `HTTP ${listing.status}; ${projects.length} projects`);
    check(`${key}-tenant-isolation`, projects.every((project) => project.organizationId === undefined || project.organizationId === '916f54ec-af22-45e0-99db-a369d9630002'), 'no foreign organization in response');
    if (key === 'buildingManager') {
      check('building-manager-scope', projects.every((project) => !project.buildingId || project.buildingId === 'd3000002-0000-4000-8000-000000000001'), `${projects.length} scoped projects`);
    }
  }
  if (process.env.CORO_DEMO_AUTH_RESET_AFTER === 'true') {
    const prisma = new PrismaClient();
    try { await resetDemoIdentities(prisma); } finally { await prisma.$disconnect(); }
    for (const [key, actor] of Object.entries(demoActors)) {
      const denied = await call(actor.kind === 'portal' ? '/client-portal/projects' : '/projects', { token: sessions[key].token });
      check(`${key}-revoked-session`, [401, 403].includes(denied.status), `HTTP ${denied.status}`);
    }
    report.reset = { residualAccess: false, identitiesInactive: true };
  }
  report.pass = true;
} catch (error) {
  report.pass = false;
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  await adapter.close();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: report.pass, evidence: output, checks: report.checks, failure: report.failure || null })}\n`);
}
