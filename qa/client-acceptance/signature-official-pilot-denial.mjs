#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  resolveExerciseRexRuntime,
  sanitizedExerciseRexRuntime,
} from '../global-e2e/src/exercise-rex-runtime.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { QaIdentityLab } from '../global-e2e/src/browser-orchestration.mjs';

const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: runtime.mfaDirectory,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: runtime.apiUrl,
  portalUrl: runtime.portalUrl,
  frontendUrl: runtime.portalUrl,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const projectId = '50000000-0000-4000-8000-000000000001';
const report = {
  schemaVersion: 1,
  completedAt: null,
  runtime: sanitizedExerciseRexRuntime(runtime),
  checks: [],
};
const check = (id, pass, observed) =>
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', observed });

try {
  await mkdir(runtime.evidenceDirectory, { recursive: true });
  const manager = await lab.loginAs('clientLocalA');
  const corporate = await lab.loginAs('clientCorporateA');
  const outsidePilot = await lab.loginAs('clientOrganizationB');

  for (const [actor, session, expectedRestricted] of [
    ['manager', manager, true],
    ['corporate', corporate, true],
    ['outside-pilot', outsidePilot, false],
  ]) {
    const policy = await lab.call('/client-portal/pilot-policy', {
      token: session.token,
    });
    check(
      `policy-${actor}`,
      policy.status === 200 && policy.data?.restricted === expectedRestricted,
      { httpStatus: policy.status, restricted: policy.data?.restricted },
    );
  }

  for (const [actor, session] of [
    ['manager', manager],
    ['corporate', corporate],
  ]) {
    for (const [operation, route, method, body] of [
      ['signature', `/client-portal/projects/${projectId}/sign`, 'POST', { fullName: 'Synthetic restricted pilot' }],
      ['status', `/client-portal/projects/${projectId}/sign-status`, 'GET', undefined],
      ['retry', `/client-portal/projects/${projectId}/sign/retry`, 'POST', {}],
      ['download', `/client-portal/projects/${projectId}/official/fr`, 'GET', undefined],
    ]) {
      const result = await lab.call(route, {
        method,
        token: session.token,
        body,
      });
      check(`${actor}-${operation}-denial`, result.status === 403, {
        httpStatus: result.status,
      });
    }
  }

  report.completedAt = new Date().toISOString();
  report.pass = report.checks.every((item) => item.status === 'PASS');
  await writeFile(
    join(runtime.evidenceDirectory, 'signature-official-pilot-denial.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `SIGNATURE_OFFICIAL_PILOT_DENIAL_${report.pass ? 'PASS' : 'FAIL'}: ${report.checks.filter((item) => item.status === 'PASS').length}/${report.checks.length}`,
  );
  if (!report.pass) process.exitCode = 1;
} finally {
  await Promise.all(
    ['clientLocalA', 'clientCorporateA', 'clientOrganizationB'].map((key) =>
      lab.logout(key).catch(() => undefined),
    ),
  );
  await adapter.close();
}
