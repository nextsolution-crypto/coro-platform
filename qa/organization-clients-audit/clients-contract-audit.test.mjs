import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const controller = readFileSync(new URL('../../coro-backend/src/clients/clients.controller.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../../coro-backend/src/clients/clients.service.ts', import.meta.url), 'utf8');
const listPage = readFileSync(new URL('../../coro-frontend/app/clients/page.tsx', import.meta.url), 'utf8');
const detailPage = readFileSync(new URL('../../coro-frontend/app/clients/[id]/page.tsx', import.meta.url), 'utf8');

function methodBody(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `missing ${signature}`);
  const end = nextSignature ? source.indexOf(nextSignature, start + signature.length) : source.length;
  assert.notEqual(end, -1, `missing boundary ${nextSignature}`);
  return source.slice(start, end);
}

test('POST /clients keeps PR #94 server-derived tenant and admin authorization', () => {
  const body = methodBody(controller, '  create(@Body()', '  @Put(\':id\')');
  assert.match(body, /requireTenantAdmin\(req\.user\)/);
  assert.match(body, /organizationId:\s*req\.user\.organizationId/);
});

test('requires tenant-admin authorization on every client mutation', () => {
  const mutationSection = controller.slice(
    controller.indexOf("  @Put(':id')"),
    controller.indexOf("@Controller('admin/organizations')"),
  );
  assert.match(mutationSection, /update\(@Param\('id'\)/);
  assert.match(mutationSection, /uploadLogo\(@Param\('id'\)/);
  assert.match(mutationSection, /remove\(@Param\('id'\)/);
  assert.equal((mutationSection.match(/requireTenantAdmin\(req\.user\)/g) ?? []).length, 3);
});

test('list and direct read are both tenant-scoped by server organization', () => {
  assert.match(controller, /findAll\(req\.user\.organizationId\)/);
  assert.match(controller, /findOne\(id, req\.user\.organizationId\)/);
  assert.match(service, /where:\s*\{\s*isActive:\s*true,\s*organizationId\s*\}/);
  assert.match(service, /where:\s*\{\s*id,\s*organizationId\s*\}/);
});

test('uses an explicit mutation projection and rejects existing portal identities', () => {
  assert.match(service, /async update\(id: string, data: UpdateClientDto, organizationId: string\)/);
  assert.match(service, /const updateData = \{/);
  assert.doesNotMatch(service, /client\.update\(\{ where: \{ id \}, data \}\)/);
  const create = methodBody(service, '  async create(data:', '  async createCorpoAccess(');
  assert.match(create, /Cette adresse est déjà associée/);
  assert.match(create, /client\.create\(\{ data:/);
  assert.match(create, /createCorpoAccess/);
  assert.doesNotMatch(create, /\$transaction/);
  assert.match(service, /role:\s*'CLIENT_CORPORATE'/);
  assert.match(service, /sendClientInvitation/);
});

test('provides explicit load errors and an accessible creation dialog', () => {
  assert.match(listPage, /Impossible de charger les clients/);
  assert.match(detailPage, /Impossible de charger le client/);
  assert.match(detailPage, /Client introuvable/);
  assert.match(listPage, /role=["']dialog["']/);
  assert.match(listPage, /aria-modal/);
  assert.match(listPage, /onKeyDown/);
  assert.doesNotMatch(listPage, /type=["']search["']/);
});
