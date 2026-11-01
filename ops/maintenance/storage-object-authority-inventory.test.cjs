'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { AUTHORITY_QUERIES, artifactKeys, candidateCategory, inventory, parseListPage, parseVersionPage, referenceKey, runReadOnlyInventory } = require('./storage-object-authority-inventory.cjs');

function prismaFixture(overrides = {}) {
  const prisma = {};
  for (const [, model] of AUTHORITY_QUERIES) prisma[model] = { findMany: async () => [] };
  for (const [model, rows] of Object.entries(overrides)) prisma[model] = { findMany: async (query) => query.cursor ? [] : rows.map((row, index) => ({ id: `${model}-${index}`, ...row })) };
  return prisma;
}
async function* objects(rows) { yield* rows; }

test('covers every declared storage authority and never exposes object keys', async () => {
  const prisma = prismaFixture({
    projectFile: [{ storageKey: 'org/a.pdf', url: null }],
    exerciseReportVersion: [{ pdfStorageKey: 'org/b.pdf' }],
    documentPdfExport: [{ artifacts: { fr: { storageKey: 'org/c.pdf' } } }],
  });
  const report = await inventory({ prisma, bucketObjects: objects([{ key: 'org/a.pdf', size: 4 }, { key: 'org/b.pdf', size: 5 }, { key: 'org/c.pdf', size: 6 }, { key: 'orphan.bin', size: 7 }]) });
  assert.deepEqual(report.totals, { authorityObjects: 3, bucketObjects: 4, referencedPresent: 3, referencedMissing: 0, unreferenced: 1, referencedBytes: 15, unreferencedBytes: 7 });
  assert.equal(JSON.stringify(report).includes('org/a.pdf'), false);
  assert.equal(report.deletionCapability, false);
});
test('does not call an object orphan merely because one authority omits it', async () => {
  const prisma = prismaFixture({ correctiveActionEvidence: [{ storageKey: 'shared/evidence.pdf' }] });
  const report = await inventory({ prisma, bucketObjects: objects([{ key: 'shared/evidence.pdf', size: 9 }]) });
  assert.equal(report.totals.unreferenced, 0);
});
test('extracts only named storage fields from nested PDF artifacts', () => {
  assert.deepEqual(artifactKeys({ url: 'ignore', nested: [{ objectKey: 'a' }, { privateReference: 'b' }] }), ['a', 'b']);
});
test('accepts canonical and allow-listed historical references only', () => {
  const encoded = Buffer.from('private/a.pdf').toString('base64url');
  assert.equal(referenceKey(`coro-private:v1:${encoded}`), 'private/a.pdf');
  assert.equal(referenceKey('https://bucket.example/private/a.pdf', new Set(['https://bucket.example'])), 'private/a.pdf');
  assert.equal(referenceKey('https://evil.example/a.pdf', new Set(['https://bucket.example'])), null);
});
test('opens a read-only transaction before inventory', async () => {
  let command = '';
  const fixture = prismaFixture();
  const prisma = { $transaction: async (fn) => fn({ ...fixture, $executeRawUnsafe: async (value) => { command = value; } }) };
  await runReadOnlyInventory({ prisma, bucketObjects: objects([]) });
  assert.equal(command, 'SET TRANSACTION READ ONLY');
});
test('parses paginated S3 object metadata without object bodies', () => {
  assert.deepEqual(parseListPage('<ListBucketResult><Contents><Key>a&amp;b.pdf</Key><LastModified>2026-10-01T00:00:00.000Z</LastModified><Size>12</Size></Contents><NextContinuationToken>next%2Fpage</NextContinuationToken></ListBucketResult>'), { objects: [{ key: 'a&b.pdf', size: 12, lastModified: '2026-10-01T00:00:00.000Z' }], nextToken: 'next%2Fpage' });
});
test('classifies candidates without emitting their keys or references', async () => {
  const report = await inventory({
    prisma: prismaFixture(), now: new Date('2026-11-01T00:00:00.000Z'),
    bucketObjects: objects([
      { key: 'official-project-pdfs/a.pdf', size: 10, lastModified: '2026-10-15T00:00:00.000Z' },
      { key: 'tmp/build.bin', size: 20, lastModified: '2025-01-01T00:00:00.000Z' },
    ]),
  });
  assert.deepEqual(report.candidateCategories.OFFICIAL_PDF_OR_EXPORT, { objects: 1, bytes: 10 });
  assert.deepEqual(report.candidateAges.LT_30_DAYS, { objects: 1, bytes: 10 });
  assert.equal(JSON.stringify(report).includes('official-project-pdfs'), false);
  assert.equal(candidateCategory('unknown.bin'), 'UNCLASSIFIED_HISTORICAL');
});
test('parses current and historical object versions without reading bodies', () => {
  const page = parseVersionPage('<ListVersionsResult><Version><Key>a&amp;b.pdf</Key><VersionId>v1</VersionId><IsLatest>false</IsLatest><LastModified>2026-01-01T00:00:00.000Z</LastModified><Size>12</Size></Version><NextKeyMarker>next</NextKeyMarker><NextVersionIdMarker>v2</NextVersionIdMarker></ListVersionsResult>');
  assert.deepEqual(page, { versions: [{ key: 'a&b.pdf', versionId: 'v1', isLatest: false, lastModified: '2026-01-01T00:00:00.000Z', size: 12 }], nextKeyMarker: 'next', nextVersionIdMarker: 'v2' });
});
test('supports the explicit stdin execution switch used by the governed workflow', () => {
  const source = fs.readFileSync(require.resolve('./storage-object-authority-inventory.cjs'), 'utf8');
  assert.match(source, /require\.main === module \|\| process\.env\.CORO_STORAGE_AUTHORITY_INVENTORY_RUN === 'true'/);
});
