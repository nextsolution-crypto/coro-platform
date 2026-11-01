#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';
const secrets = await loadSecretStore();
const output = assertUnderQaRoot(process.env.CORO_QA_LIBRARY_INACTIVE_EVIDENCE);
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
let result;
try { const email = 'advisor-a@global-e2e.test'; const startedAt = Date.now(); await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } }); const code = await lab.completeMfa({ email, key: email }, startedAt); const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } }); const response = await lab.call('/procedures/83000000-0000-4000-8000-000000000001/project/50000000-0000-4000-8000-000000000001', { method: 'PUT', token: verified.data.access_token, body: { content: { title: 'MUST-NOT-PERSIST-INACTIVE' } } }); result = { sha: process.env.CORO_QA_COMMIT_SHA, status: [403, 404].includes(response.status) ? 'PASS' : 'FAIL', httpStatus: response.status, assertion: 'inactive-project-mutation-denied' }; } finally { await adapter.close().catch(() => undefined); }
await mkdir(resolve(output, '..'), { recursive: true }); await writeFile(output, `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2)); if (result.status !== 'PASS') process.exitCode = 1;
