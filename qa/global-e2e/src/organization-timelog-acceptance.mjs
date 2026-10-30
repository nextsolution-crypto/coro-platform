#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_TIMELOG_EVIDENCE || `D:\\CORO-QA\\runs\\organization-timelog\\${new Date().toISOString().slice(0, 10)}`);
const backendUrl = process.env.CORO_QA_BACKEND_URL;
const frontendUrl = process.env.CORO_QA_FRONTEND_URL;
const portalUrl = process.env.CORO_QA_PORTAL_URL;
const databasePort = Number(process.env.CORO_QA_DATABASE_PORT || 56461);
const secrets = await loadSecretStore();
const databaseUrl = `postgresql://coro_qa:${encodeURIComponent(secrets.databasePassword)}@127.0.0.1:${databasePort}/coro_qa_global_e2e?schema=public`;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const adapter = await startMfaCaptureAdapter({ captureDirectory: process.env.CORO_QA_MFA_DIR, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: backendUrl, frontendUrl, portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  advisorA: '20000000-0000-4000-8000-000000000007', adminA: '20000000-0000-4000-8000-000000000005',
  adminB: '20000000-0000-4000-8000-000000000006',
};
const marker = `TIMELOG-QA-${Date.now()}`;
const report = { executedAt: new Date().toISOString(), marker, checks: [], matrix: [], consoleErrors: [], limitations: [] };
const check = (id, pass, detail) => { report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail }); if (!pass) throw new Error(`${id}: ${detail}`); };
const rawLogin = async (email) => {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  check(`password-${email}`, [200, 201].includes(first.status) && first.data?.mfaRequired, `HTTP ${first.status}`);
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  check(`mfa-${email}`, [200, 201].includes(verified.status) && Boolean(verified.data?.access_token), `HTTP ${verified.status}`);
  return { token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user };
};
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT' }, { name: 'glass-light', ui: 'glass', preference: 'LIGHT' }, { name: 'glass-dark', ui: 'glass', preference: 'DARK' }];
const geometry = () => {
  const controls = [...document.querySelectorAll('button,a,input,select')].filter((node) => { const box = node.getBoundingClientRect(); const style = getComputedStyle(node); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden'; }).map((node) => { const box = node.getBoundingClientRect(); return { tag: node.tagName, left: box.left, right: box.right, top: box.top, bottom: box.bottom }; });
  return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, outside: controls.filter((box) => box.right > 0 && box.left < innerWidth && (box.left < -1 || box.right > innerWidth + 1)), text: document.body.innerText, ui: document.documentElement.dataset.ui, theme: document.documentElement.dataset.theme };
};

let browser;
let isolated;
let entryId;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const advisor = await lab.loginAs('advisor');
  const adminA = await rawLogin('customer-admin-a@global-e2e.test');
  // Authentication throttling is intentional. Let the canonical window elapse
  // instead of resetting counters, rotating identities, or weakening policy.
  await new Promise((resolve) => setTimeout(resolve, 55_000));
  const adminB = await rawLogin('customer-admin-b@global-e2e.test');
  const revoked = await lab.loginAs('revokedUser');
  check('revoked-user-denied', revoked.denied === true && revoked.status >= 400, `HTTP ${revoked.status}`);

  const catalog = await lab.call('/timelog/catalog', { token: advisor.token });
  check('catalog-authorized', catalog.status === 200 && catalog.data.length > 0, `HTTP ${catalog.status}`);
  const category = catalog.data[0].key;
  const before = await lab.call('/timelog/me?from=2026-10-01&to=2026-10-31', { token: advisor.token });
  check('advisor-read-own-scope', before.status === 200, `HTTP ${before.status}`);
  const requestId = crypto.randomUUID();
  const payload = { date: '2026-10-29', heures: 1.75, category, note: marker, clientRequestId: requestId };
  const created = await lab.call('/timelog/me', { method: 'POST', token: advisor.token, body: payload });
  check('create-canonical-entry', created.status === 201 && created.data.userId === ids.advisorA && created.data.organizationId === ids.orgA, `HTTP ${created.status}`);
  entryId = created.data.id;
  const replay = await lab.call('/timelog/me', { method: 'POST', token: advisor.token, body: payload });
  const replayCount = await prisma.timelogEntry.count({ where: { organizationId: ids.orgA, userId: ids.advisorA, clientRequestId: requestId } });
  check('lost-response-idempotency', replay.status === 201 && replay.data.id === entryId && replayCount === 1, `HTTP ${replay.status}; count ${replayCount}`);
  const conflictKey = await lab.call('/timelog/me', { method: 'POST', token: advisor.token, body: { ...payload, heures: 2 } });
  check('idempotency-key-payload-conflict', conflictKey.status === 409, `HTTP ${conflictKey.status}`);

  for (const [name, invalid] of [
    ['zero-duration', { ...payload, clientRequestId: crypto.randomUUID(), heures: 0 }],
    ['negative-duration', { ...payload, clientRequestId: crypto.randomUUID(), heures: -1 }],
    ['impossible-date', { ...payload, clientRequestId: crypto.randomUUID(), date: '2026-02-31' }],
    ['unknown-category', { ...payload, clientRequestId: crypto.randomUUID(), category: 'unknown-category' }],
  ]) {
    const result = await lab.call('/timelog/me', { method: 'POST', token: advisor.token, body: invalid });
    check(`reject-${name}`, [400, 404].includes(result.status), `HTTP ${result.status}`);
  }
  const forgedAuthority = await lab.call('/timelog/me', { method: 'POST', token: advisor.token, body: {
    ...payload, clientRequestId: crypto.randomUUID(), userId: ids.adminB, organizationId: ids.orgB,
  } });
  check('forged-authority-is-ignored', forgedAuthority.status === 201 && forgedAuthority.data.userId === ids.advisorA && forgedAuthority.data.organizationId === ids.orgA, `HTTP ${forgedAuthority.status}; owner ${forgedAuthority.data?.userId}; tenant ${forgedAuthority.data?.organizationId}`);
  await prisma.timelogEntry.delete({ where: { id: forgedAuthority.data.id } });
  const reversed = await lab.call('/timelog/me?from=2026-10-31&to=2026-10-01', { token: advisor.token });
  check('reject-reversed-period', reversed.status === 400, `HTTP ${reversed.status}`);

  const updated = await lab.call(`/timelog/me/${entryId}`, { method: 'PUT', token: advisor.token, body: { heures: 2.25, note: `${marker}-updated`, lockVersion: 0 } });
  check('optimistic-update', updated.status === 200 && updated.data.lockVersion === 1, `HTTP ${updated.status}`);
  const stale = await lab.call(`/timelog/me/${entryId}`, { method: 'PUT', token: advisor.token, body: { heures: 9, lockVersion: 0 } });
  check('stale-update-conflict', stale.status === 409, `HTTP ${stale.status}`);
  const adminForeignMutation = await lab.call(`/timelog/me/${entryId}`, { method: 'PUT', token: adminA.token, body: { heures: 9, lockVersion: 1 } });
  check('same-tenant-owner-isolation', adminForeignMutation.status === 404, `HTTP ${adminForeignMutation.status}`);
  const otherTenantMutation = await lab.call(`/timelog/me/${entryId}`, { method: 'PUT', token: adminB.token, body: { heures: 9, lockVersion: 1 } });
  check('cross-tenant-direct-isolation', otherTenantMutation.status === 404, `HTTP ${otherTenantMutation.status}`);
  const teamDenied = await lab.call('/timelog/team?from=2026-10-01&to=2026-10-31', { token: advisor.token });
  check('team-non-admin-denied', teamDenied.status === 403, `HTTP ${teamDenied.status}`);
  const teamA = await lab.call('/timelog/team?from=2026-10-01&to=2026-10-31', { token: adminA.token });
  check('team-admin-scoped', teamA.status === 200 && teamA.data.some((row) => row.userId === ids.advisorA) && !teamA.data.some((row) => row.userId === ids.adminB), `HTTP ${teamA.status}`);
  const persisted = await prisma.timelogEntry.findUnique({ where: { id: entryId } });
  check('conflict-has-no-side-effect', persisted?.heures === 2.25 && persisted?.lockVersion === 1, JSON.stringify(persisted));
  const after = await lab.call('/timelog/me?from=2026-10-01&to=2026-10-31', { token: advisor.token });
  check('summary-capacity-updated', after.status === 200 && after.data.summary.heuresTimelog >= before.data.summary.heuresTimelog + 2.25, JSON.stringify(after.data.summary));

  browser = await puppeteer.launch({ headless: true });
  isolated = await lab.createIsolatedSession('advisor', { browser });
  await isolated.page.evaluate(({ token, refresh, user }) => { localStorage.setItem('coro_token', token); localStorage.setItem('coro_refresh_token', refresh); localStorage.setItem('coro_user', JSON.stringify(user)); }, { token: advisor.token, refresh: advisor.refresh, user: advisor.user });
  isolated.page.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(event.text()); });
  isolated.page.on('pageerror', (error) => report.consoleErrors.push(error.message));
  for (const viewport of viewports) for (const theme of themes) {
    await isolated.page.setViewport(viewport);
    await isolated.page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); localStorage.setItem('coro-glass-beta', 'on'); }, theme);
    await isolated.page.goto(`${frontendUrl}/timelog`, { waitUntil: 'networkidle0' });
    const state = await isolated.page.evaluate(geometry);
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    const pass = !state.overflow && state.outside.length === 0 && /Mes heures|Timelog/i.test(state.text) && state.text.includes(marker);
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', overflow: state.overflow, controlsOutside: state.outside.length, ui: state.ui, theme: state.theme });
    await isolated.page.screenshot({ path: join(evidenceRoot, `timelog-${id}.png`), fullPage: true });
    check(`browser-${id}`, pass, JSON.stringify(report.matrix.at(-1)));
  }
  await isolated.page.reload({ waitUntil: 'networkidle0' });
  check('f5-session-and-data-persistence', await isolated.page.evaluate((text) => Boolean(localStorage.getItem('coro_token')) && document.body.innerText.includes(text), marker), 'token and entry retained after reload');
  await isolated.page.keyboard.press('Tab');
  const focus = await isolated.page.evaluate(() => { const box = document.activeElement?.getBoundingClientRect(); return Boolean(box && box.width > 0 && box.height > 0); });
  check('keyboard-focus', focus, 'first keyboard target is visible');
  const cdp = await isolated.page.createCDPSession();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const zoom = await isolated.page.evaluate(geometry);
  check('zoom-200-no-horizontal-overflow', !zoom.overflow, JSON.stringify({ overflow: zoom.overflow, outside: zoom.outside.length }));
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });

  const staleDelete = await lab.call(`/timelog/me/${entryId}?lockVersion=0`, { method: 'DELETE', token: advisor.token });
  check('stale-delete-conflict', staleDelete.status === 409, `HTTP ${staleDelete.status}`);
  const deleted = await lab.call(`/timelog/me/${entryId}?lockVersion=1`, { method: 'DELETE', token: advisor.token });
  check('authorized-delete', deleted.status === 200 && deleted.data.deleted, `HTTP ${deleted.status}`);
  entryId = undefined;
  const restored = await lab.call('/timelog/me?from=2026-10-01&to=2026-10-31', { token: advisor.token });
  check('summary-capacity-restored-after-delete', restored.status === 200 && restored.data.summary.heuresTimelog === before.data.summary.heuresTimelog, JSON.stringify(restored.data.summary));
  check('no-critical-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
  report.limitations.push({ id: 'real-screen-reader', status: 'NOT_VERIFIED', reason: 'No real screen-reader runtime is available in the isolated QA harness.' });
  report.verdict = 'ACCEPTATION_INTÉGRÉE_PASS';
} catch (error) {
  report.verdict = 'BLOQUÉ';
  report.error = error instanceof Error ? { message: error.message, stack: error.stack } : String(error);
  process.exitCode = 1;
} finally {
  if (entryId) await prisma.timelogEntry.deleteMany({ where: { id: entryId } }).catch(() => undefined);
  if (isolated?.context) await isolated.context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  await adapter.close().catch(() => undefined);
  await writeFile(join(evidenceRoot, 'organization-timelog-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
