import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const evidenceRoot = process.env.CORO_ACTIVITIES_AUDIT_EVIDENCE
  ? path.resolve(process.env.CORO_ACTIVITIES_AUDIT_EVIDENCE)
  : path.join(root, '.audit-evidence', 'organization-activities');

const sources = {
  portfolio: 'coro-frontend/app/activities/portfolio/page.tsx',
  activityController: 'coro-backend/src/activities/activities.controller.ts',
  activityService: 'coro-backend/src/activities/activities.service.ts',
  portal: 'coro-client-portal/app/activities/page.tsx',
  portalService: 'coro-backend/src/client-portal/client-portal.service.ts',
  stack: 'qa/global-e2e/identity-stack.ps1',
};

const text = Object.fromEntries(
  await Promise.all(Object.entries(sources).map(async ([key, file]) => [
    key,
    await readFile(path.join(root, file), 'utf8'),
  ])),
);

const checks = [
  ['ACT-001', 'portfolio fan-out is capped at 200 projects', text.portfolio.includes('/projects?limit=200')],
  ['ACT-002', 'per-project activity failures are swallowed', /catch\s*\{\s*\}/.test(text.portfolio)],
  ['ACT-003', 'activity update lacks canonical actor scope', /updateActivity\(\s*activityId,\s*req\.user\.organizationId/.test(text.activityController)],
  ['ACT-004', 'activity delete lacks canonical actor scope', /deleteActivity\(activityId, req\.user\.organizationId\)/.test(text.activityController)],
  ['ACT-005', 'activity duplicate lacks canonical actor scope', /duplicateActivities\(projectId, req\.user\.organizationId\)/.test(text.activityController)],
  ['ACT-006', 'ICS lookup is organization-only', /where: \{ id: activityId, organizationId: req\.user\.organizationId \}/.test(text.activityController)],
  ['ACT-007', 'portfolio endpoint is organization/client-only', /getClientPortfolio\(clientId, req\.user\.organizationId\)/.test(text.activityController)],
  ['ACT-008', 'client activity listing applies client and manager-building scope', text.portalService.includes("role === 'CLIENT_MANAGER'") && text.portalService.includes('clientId,') && text.portalService.includes('clientVisible: true')],
  ['ACT-009', 'client UI exposes explicit load error and retry', text.portal.includes('Réessayer') && text.portal.includes('setLoadError')],
  ['ACT-010', 'permanent stack omits organization frontend', !/FrontendPort|coro-frontend|frontend-publish/.test(text.stack)],
];

const failed = checks.filter(([, , result]) => !result);
const report = {
  generatedAt: new Date().toISOString(),
  sourceHead: process.env.CORO_AUDIT_HEAD ?? '93fedd799f76f8aab963df89017c62508f95a7a4',
  productionMutation: false,
  productCodeChange: false,
  externalProviders: 'SIMULATED_ONLY',
  checks: checks.map(([id, statement, observed]) => ({ id, statement, observed })),
  runnerStatus: failed.length ? 'FAIL' : 'PASS',
};

await mkdir(evidenceRoot, { recursive: true });
await writeFile(path.join(evidenceRoot, 'source-contract-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
