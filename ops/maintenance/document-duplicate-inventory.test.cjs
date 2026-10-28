'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const { collectDuplicateInventory, runReadOnlyInventory, sanitizedReport } = require('./document-duplicate-inventory.cjs');

const group = (overrides = {}) => ({
  projectId: 'project-a',
  organizationId: 'organization-a',
  documentType: 'PMU',
  projectStatus: 'IN_PROGRESS',
  projectActive: true,
  documentCount: 2,
  documentStatuses: ['DRAFT', 'IN_PROGRESS'],
  ...overrides,
});

test('starts from stdin only when the explicit runtime switch is present', () => {
  const source = readFileSync(require.resolve('./document-duplicate-inventory.cjs'), 'utf8');
  assert.match(source, /require\.main === module \|\| process\.env\.CORO_DOCUMENT_DUPLICATE_INVENTORY_RUN === 'true'/);
});

test('publishes only a sanitized aggregate and removes temporary evidence', () => {
  const workflow = readFileSync(require.resolve('../../.github/workflows/production-document-duplicate-inventory.yml'), 'utf8');
  assert.match(workflow, /delete r\.groups;process\.stdout\.write/);
  assert.match(workflow, /trap 'rm -f -- "\$script" "\$evidence"' EXIT/);
  assert.doesNotMatch(workflow, /scp-action|upload-artifact|protected-evidence/);
});

test('reports a genuinely blocking duplicate and emits a sanitized public summary', async () => {
  let called = false;
  const report = await collectDuplicateInventory(async () => {
    if (called) return [];
    called = true;
    return [group()];
  });
  assert.equal(report.groupCount, 1);
  assert.equal(report.documentCount, 2);
  assert.equal(report.groups[0].projectId, 'project-a');
  assert.doesNotMatch(JSON.stringify(sanitizedReport(report)), /project-a|organization-a/);
});

test('reports an empty inventory without manufacturing a duplicate', async () => {
  const report = await collectDuplicateInventory(async () => []);
  assert.equal(report.groupCount, 0);
  assert.equal(report.documentCount, 0);
});

test('keeps organizations and projects separate', async () => {
  const rows = [
    group(),
    group({ projectId: 'project-b', organizationId: 'organization-b', documentCount: 3 }),
  ];
  const report = await collectDuplicateInventory(async ({ afterProjectId }) => afterProjectId ? [] : rows);
  assert.equal(report.groupCount, 2);
  assert.deepEqual(report.groups.map(({ projectId, organizationId }) => [projectId, organizationId]), [
    ['project-a', 'organization-a'], ['project-b', 'organization-b'],
  ]);
});

test('enforces a database read-only transaction before the query', async () => {
  const calls = [];
  const transaction = {
    $executeRawUnsafe: async (statement) => calls.push(statement),
    $queryRawUnsafe: async () => [],
  };
  const prisma = { $transaction: async (callback, options) => { calls.push(options); return callback(transaction); } };
  const report = await runReadOnlyInventory(prisma);
  assert.equal(calls[0].timeout, 300_000);
  assert.equal(calls[1], 'SET TRANSACTION READ ONLY');
  assert.equal(report.groupCount, 0);
});

test('the production query includes every Document status and excludes legitimate ProjectVersion history', () => {
  const source = readFileSync(require.resolve('./document-duplicate-inventory.cjs'), 'utf8');
  assert.match(source, /INNER JOIN "Document" d ON d\."projectId" = p\."id"/);
  assert.match(source, /HAVING COUNT\(d\."id"\) > 1/);
  assert.doesNotMatch(source, /JOIN "ProjectVersion"/);
  assert.doesNotMatch(source, /d\."status"\s*(?:=|IN)/);
});

test('fails closed on malformed or unbounded pages', async () => {
  await assert.rejects(() => collectDuplicateInventory(async () => [group({ documentCount: 1 })]), /INVALID_DUPLICATE_GROUP/);
  await assert.rejects(() => collectDuplicateInventory(async () => Array.from({ length: 101 }, (_, index) => group({ projectId: `p-${index}` }))), /INVALID_PAGE/);
});
