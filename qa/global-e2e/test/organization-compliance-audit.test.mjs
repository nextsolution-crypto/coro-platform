import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const page = await readFile(resolve(root, 'coro-frontend/app/buildings/compliance/page.tsx'), 'utf8');
const service = await readFile(resolve(root, 'coro-backend/src/projects/projects.service.ts'), 'utf8');
const controller = await readFile(resolve(root, 'coro-backend/src/projects/projects.controller.ts'), 'utf8');

test('compliance endpoint remains read-only and authenticated', () => {
  assert.match(controller, /@Controller\('projects'\)[\s\S]*@UseGuards\(AuthGuard\('jwt'\), OrganizationStatusGuard\)/);
  assert.match(controller, /@Get\('buildings-compliance'\)/);
  assert.doesNotMatch(controller, /@(Post|Put|Patch|Delete)\('buildings-compliance'/);
});

test('characterizes the current technical-age formula and labels', () => {
  assert.match(service, /lastDoc\.updatedAt/);
  assert.match(service, /30\.44/);
  assert.match(service, /monthsAgo >= 12/);
  assert.match(page, /Conforme/);
  assert.match(page, /Expir/);
});

test('characterizes missing error and retry presentation', () => {
  assert.match(page, /catch \(err\) \{ console\.error\(err\); \}/);
  assert.doesNotMatch(page, /role=["']alert["']/);
  assert.doesNotMatch(page, /R[eé]essayer/);
});

test('characterizes absent portal counterpart and absent exports', async () => {
  const portalFiles = await import('node:fs/promises').then(({ readdir }) => readdir(resolve(root, 'coro-client-portal/app')));
  assert.ok(!portalFiles.includes('compliance'));
  assert.doesNotMatch(page, />\s*(Exporter|T[eé]l[eé]charger)/i);
});
