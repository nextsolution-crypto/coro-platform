#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const evidenceRoot = resolve(process.env.CORO_QA_PROJECT_DOCUMENTS_EVIDENCE || join(root, 'qa-evidence', 'organization-project-documents'));
const controller = await readFile(join(root, 'coro-backend/src/project-files/project-files.controller.ts'), 'utf8');
const service = await readFile(join(root, 'coro-backend/src/project-files/project-files.service.ts'), 'utf8');
const component = await readFile(join(root, 'coro-frontend/components/ProjectFiles.tsx'), 'utf8');

const checks = [];
const check = (id, pass, detail) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
check('baseline-controller-authenticated', controller.includes("@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)"), 'JWT and organization status guard are declared.');
check('canonical-project-scope-on-list', /getFilesForProject\(\s*projectId,\s*visibility,\s*req\.user\.organizationId,\s*req\.user/.test(controller), 'Expected actor/project scope is forwarded to the service.');
check('canonical-project-scope-on-upload', /uploadFile\([\s\S]*permittedBuildingIds|projectAccessWhere/.test(controller), 'Expected actor/project scope is enforced for upload.');
check('active-project-on-document-list', /id:\s*projectId,\s*organizationId,\s*isActive:\s*true/.test(service.slice(service.indexOf('async getFilesForProject'), service.indexOf('async getSignedUrl'))), 'Document listing requires an active project.');
check('archive-write-denial', /uploadFile[\s\S]*?status:\s*\{\s*not:\s*['"]ARCHIVED/.test(service), 'Upload explicitly denies archived projects.');
check('private-download-actor-scope', /downloadPrivate\([\s\S]*req\.user[\s\S]*permittedBuildingIds/.test(controller), 'Private download forwards actor scope.');
check('no-legacy-direct-url', !component.includes('window.open(file.url') && !service.includes("return { url: file.url"), 'All downloads use the authenticated private-content authority.');
check('truthful-list-error-state', /file(?:List|Fetch)Error|setFilesError/.test(component), 'The file list distinguishes errors from an empty collection.');
check('retry-control', /R[eé]essayer/.test(component), 'A retry action is available after list/download failure.');
check('responsive-primitives', component.includes('min-w-0') && component.includes('flex-wrap') && component.includes('break-words'), 'Component uses local overflow controls.');

const report = {
  executedAt: new Date().toISOString(),
  baseline: process.env.CORO_QA_COMMIT || null,
  kind: 'static-contract-audit',
  checks,
  liveRuntime: 'NOT_VERIFIED',
  note: 'This runner is evidence of source contracts only; it never substitutes for PostgreSQL/API/browser acceptance.',
};
await mkdir(evidenceRoot, { recursive: true });
await writeFile(join(evidenceRoot, 'static-contract-audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks: checks.length, pass: checks.filter((item) => item.status === 'PASS').length, fail: checks.filter((item) => item.status === 'FAIL').length }));
