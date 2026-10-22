#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const requireFromBackend = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = requireFromBackend('@prisma/client');
const api = String(process.env.CORO_QA_BACKEND_URL || '').replace(/\/$/, '');
const actorFile = process.env.CORO_QA_ACTOR_FILE;
const mfaDir = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const output = process.env.CORO_QA_COMMERCIAL_EVIDENCE;
if (!api.startsWith('http://127.0.0.1:') || !actorFile || !mfaDir || !password || !output?.startsWith('D:\\CORO-QA\\')) {
  throw new Error('Fail-closed QA runtime configuration required.');
}
const ids = JSON.parse(await readFile(actorFile, 'utf8'));
const prisma = new PrismaClient();
const report = { executedAt: new Date().toISOString(), checks: [] };

async function call(method, route, token, body) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const requestId = response.headers.get('x-request-id') || response.headers.get('x-correlation-id');
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, requestId };
}
function requireStatus(id, response, expected) {
  const pass = expected.includes(response.status);
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', httpStatus: response.status, requestId: response.requestId || null });
  if (!pass) throw new Error(`${id}: HTTP ${response.status}; ${JSON.stringify(response.data)}`);
  return response.data;
}
async function latestCode(email, after) {
  const entries = await Promise.all((await readdir(mfaDir)).map(async (name) => ({ name, time: (await stat(join(mfaDir, name))).mtimeMs })));
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDir, entry.name), 'utf8'));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(localPart) {
  const email = `${localPart}@global-e2e.test`;
  const started = Date.now();
  const first = await call('POST', '/auth/login', null, { email, password });
  requireStatus(`authentication-${localPart}`, first, [200, 201]);
  const verified = await call('POST', '/auth/verify-mfa', null, { email, code: await latestCode(email, started) });
  const token = verified.data?.access_token ?? verified.data?.token;
  requireStatus(`mfa-${localPart}`, verified, [200, 201]);
  if (!token) throw new Error(`Missing token for ${localPart}`);
  return token;
}

try {
  const prerequisite = await prisma.organizationContractRevision.findFirst({
    where: { contract: { reference: 'QA-MASTER-A-CONTRACT' }, status: 'SIGNED' },
    include: { contract: true, priceLines: true, sourceProposalRevision: true },
  });
  if (!prerequisite?.sourceProposalRevision || prerequisite.priceLines.length !== 1) throw new Error('Synthetic prerequisite is incomplete.');
  const founder = await login('founder');
  const authorityState = requireStatus('platform-authority-state', await call('GET', '/admin/v1/platform-authority/me', founder), [200]);
  if (authorityState.authorityStatus !== 'ACTIVE') {
    const authorityDraft = requireStatus('platform-authority-draft', await call('POST', '/admin/v1/platform-authority/draft', founder, {
      operatorOrganizationId: ids.operator, founderUserId: ids.founder,
      reason: 'Governed MASTER A QA initialization',
    }), [201]);
    requireStatus('platform-authority-activation', await call('POST', '/admin/v1/platform-authority/activate', founder, {
      lockVersion: authorityDraft.lockVersion, reason: 'Governed MASTER A QA activation',
    }), [201]);
  } else {
    report.checks.push({ id: 'platform-authority-active-existing', status: 'PASS' });
  }
  const activeGrants = requireStatus('platform-authority-grants-existing', await call('GET', '/admin/v1/platform-authority/grants', founder), [200]);
  for (const permission of ['COMMERCIAL_SUBSCRIPTION_MANAGE', 'COMMERCIAL_BILLING_MANAGE', 'COMMERCIAL_BILLING_APPROVE', 'COMMERCIAL_PAYMENT_RECORD', 'ORGANIZATION_360_READ']) {
    const alreadyGranted = Array.isArray(activeGrants) && activeGrants.some((grant) =>
      grant.userId === ids.employeeOrg && grant.permission === permission && grant.scope === 'ORGANIZATION' &&
      grant.targetOrganizationId === ids.orgA && !grant.revokedAt);
    if (alreadyGranted) {
      report.checks.push({ id: `grant-${permission}-existing`, status: 'PASS' });
      continue;
    }
    requireStatus(`grant-${permission}`, await call('POST', '/admin/v1/platform-authority/grants', founder, {
      userId: ids.employeeOrg, permission, scope: 'ORGANIZATION', targetOrganizationId: ids.orgA,
      reason: `MASTER A QA exact ${permission} grant`,
    }), [201]);
  }
  const employee = await login('employee-org');
  const unrelated = await login('customer-admin-b');
  const base = `/admin/v1/organizations/${ids.orgA}`;
  const subscriptionBody = {
    reference: 'QA-SUB-MASTER-A-001', contractId: prerequisite.contractId,
    contractRevisionId: prerequisite.id, proposalRevisionId: prerequisite.sourceProposalRevision.id,
    priceBookVersionId: prerequisite.priceBookVersionId, billingCadence: 'MONTHLY',
    effectiveFrom: '2026-11-01', renewalAt: '2027-11-01', idempotencyKey: 'qa-master-a-subscription-001',
    reason: 'MASTER A synthetic subscription acceptance', items: [{ contractSnapshotLineId: prerequisite.priceLines[0].id }],
  };
  const subscription = requireStatus('subscription-create', await call('POST', `${base}/subscriptions`, employee, subscriptionBody), [201]);
  const replay = requireStatus('subscription-idempotency', await call('POST', `${base}/subscriptions`, employee, subscriptionBody), [200, 201]);
  if (replay.id !== subscription.id) throw new Error('Subscription idempotency identity mismatch.');
  requireStatus('cross-tenant-employee-denial', await call('GET', `/admin/v1/organizations/${ids.orgB}/subscriptions`, employee), [403, 404]);
  requireStatus('unrelated-admin-denial', await call('GET', `${base}/subscriptions`, unrelated), [403, 404]);
  let current = requireStatus('subscription-activate', await call('POST', `${base}/subscriptions/${subscription.id}/activate`, employee, { lockVersion: subscription.lockVersion, reason: 'Explicit activation' }), [201]);
  let continuity = requireStatus('entitlement-continuity-active', await call('GET', `${base}/subscriptions/${subscription.id}/entitlement-continuity`, employee), [200]);
  if (continuity.automaticSuspension || continuity.criticalEmergencyAutomaticDisable || !continuity.items.every((item) => item.subscriptionActive)) throw new Error('Entitlement continuity policy mismatch.');
  const tax = requireStatus('tax-draft', await call('POST', `${base}/billing/tax-configurations`, employee, {
    jurisdictionCode: 'CA-QC-QA', name: 'Configuration fiscale synthétique non officielle',
    federalRatePartsPerMillion: 50000, provincialRatePartsPerMillion: 99750,
    effectiveFrom: '2026-01-01', reason: 'Synthetic governed tax configuration',
  }), [201]);
  const approvedTax = requireStatus('tax-approval', await call('POST', `${base}/billing/tax-configurations/${tax.id}/approve`, founder, { lockVersion: tax.lockVersion, reason: 'Separate synthetic approval' }), [201]);
  const invoice = requireStatus('invoice-draft', await call('POST', `${base}/billing/invoices`, employee, {
    subscriptionId: subscription.id, taxConfigurationId: approvedTax.id,
    periodStart: '2026-11-01', periodEnd: '2026-12-01', idempotencyKey: 'qa-master-a-invoice-001',
    reason: 'Synthetic invoice, not issued externally', lines: [{ description: 'CORO Network — QA synthétique',
      sourceSnapshotLineId: prerequisite.priceLines[0].id, quantity: '1', unitAmountMinor: '10000', taxable: true, displayOrder: 0 }],
  }), [201]);
  let issued = requireStatus('invoice-approval', await call('POST', `${base}/billing/invoices/${invoice.id}/approve`, founder, { lockVersion: invoice.lockVersion, reason: 'Separate invoice approval' }), [201]);
  issued = requireStatus('invoice-issue', await call('POST', `${base}/billing/invoices/${invoice.id}/issue`, founder, { lockVersion: issued.lockVersion, reason: 'QA issuance only', invoiceNumber: 'QA-INV-2026-001' }), [201]);
  current = requireStatus('subscription-past-due', await call('POST', `${base}/subscriptions/${subscription.id}/past-due`, employee, { lockVersion: current.lockVersion, reason: 'Synthetic overdue monitoring' }), [201]);
  continuity = requireStatus('past-due-no-auto-suspension', await call('GET', `${base}/subscriptions/${subscription.id}/entitlement-continuity`, employee), [200]);
  if (!continuity.items.every((item) => item.subscriptionActive)) throw new Error('PAST_DUE disabled subscribed modules.');
  requireStatus('manual-payment', await call('POST', `${base}/billing/invoices/${invoice.id}/payments`, employee, {
    amountMinor: String(issued.totalMinor), paidAt: '2026-12-10T15:00:00.000Z', evidenceReference: 'QA-MANUAL-PAYMENT-EVIDENCE',
    idempotencyKey: 'qa-master-a-payment-001', reason: 'Synthetic manual payment record',
  }), [201]);
  current = requireStatus('subscription-reactivation', await call('POST', `${base}/subscriptions/${subscription.id}/reactivate`, employee, { lockVersion: current.lockVersion, reason: 'Explicit governed reactivation' }), [201]);
  const credit = requireStatus('credit-note-draft', await call('POST', `${base}/billing/invoices/${invoice.id}/credit-notes`, employee, { amountMinor: '100', reason: 'Synthetic adjustment' }), [201]);
  let approvedCredit = requireStatus('credit-note-approval', await call('POST', `${base}/billing/invoices/${invoice.id}/credit-notes/${credit.id}/approve`, founder, { lockVersion: credit.lockVersion, reason: 'Separate credit approval', approvalReference: 'QA-CREDIT-APPROVAL' }), [201]);
  requireStatus('credit-note-issue', await call('POST', `${base}/billing/invoices/${invoice.id}/credit-notes/${credit.id}/issue`, founder, { lockVersion: approvedCredit.lockVersion, reason: 'QA credit issuance only', creditNoteNumber: 'QA-CN-2026-001' }), [201]);
  current = requireStatus('subscription-renewal', await call('POST', `${base}/subscriptions/${subscription.id}/renew`, employee, { lockVersion: current.lockVersion, effectiveFrom: '2027-11-01', renewalAt: '2028-11-01', termMonths: 12, reason: 'Explicit synthetic renewal' }), [201]);
  const commercial = requireStatus('organization-360-commercial', await call('GET', `${base}/commercial`, employee), [200]);
  if (!commercial.subscription?.id || commercial.billing?.currency !== 'CAD' || commercial.billing?.automaticCollection !== false) throw new Error('Organization 360 commercial projection mismatch.');
  const audits = await prisma.adminAuditEvent.count({ where: { organizationId: ids.orgA, action: { startsWith: 'COMMERCIAL_' } } });
  report.checks.push({ id: 'audit-provenance', status: audits >= 12 ? 'PASS' : 'FAIL', eventCount: audits });
  if (audits < 12) throw new Error(`Insufficient commercial audit events: ${audits}`);
  const renewal = await prisma.commercialSubscriptionRenewal.findFirst({ where: { subscriptionId: subscription.id } });
  report.checks.push({ id: 'non-destructive-renewal-history', status: renewal && current.effectiveFrom.startsWith('2026-11-01') ? 'PASS' : 'FAIL' });
  if (!renewal || !current.effectiveFrom.startsWith('2026-11-01')) throw new Error('Renewal history is destructive or missing.');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = String(error?.message || error).replace(/\b\d{6}\b/g, '[REDACTED]');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await mkdir(output.substring(0, output.lastIndexOf('\\')), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
