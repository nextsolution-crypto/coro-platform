import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const page = await readFile(resolve(root, 'coro-frontend/app/buildings/compliance/page.tsx'), 'utf8');
const service = await readFile(resolve(root, 'coro-backend/src/projects/projects.service.ts'), 'utf8');
const controller = await readFile(resolve(root, 'coro-backend/src/projects/projects.controller.ts'), 'utf8');

test('endpoint is authenticated, read-only and passes the full actor', () => {
  assert.match(controller, /@Controller\('projects'\)[\s\S]*@UseGuards\(AuthGuard\('jwt'\), OrganizationStatusGuard\)/);
  assert.match(controller, /@Get\('buildings-compliance'\)/);
  assert.match(controller, /getBuildingsCompliance\(req\.user\)/);
  assert.doesNotMatch(controller, /@(Post|Put|Patch|Delete)\('buildings-compliance'/);
});

test('uses canonical scope and factual document states without regulatory inference', () => {
  const method = service.slice(service.indexOf('async getBuildingsCompliance'), service.indexOf('async submitForApproval'));
  assert.match(method, /projectAccessWhere\(actor\)/);
  assert.match(method, /APPROVED_AVAILABLE/);
  assert.match(method, /DRAFT_ONLY/);
  assert.doesNotMatch(method, /30\.44|monthsAgo >= 12|CONFORME/);
  assert.match(page, /ne constitue pas une attestation de conformité réglementaire/);
  assert.match(page, /Document approuvé disponible/);
});

test('presents failures separately from empty states with retry', () => {
  assert.match(page, /role="alert"/);
  assert.match(page, /Réessayer/);
  assert.match(page, /Aucun bâtiment accessible dans votre périmètre/);
  assert.match(page, /Aucun résultat ne correspond aux filtres sélectionnés/);
});

test('keeps the portal counterpart and export outside this targeted batch', async () => {
  const portalFiles = await readdir(resolve(root, 'coro-client-portal/app'));
  assert.ok(!portalFiles.includes('compliance'));
  assert.doesNotMatch(page, />\s*(Exporter|Télécharger)/i);
});
