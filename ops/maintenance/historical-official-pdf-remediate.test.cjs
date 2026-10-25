'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { ReadableStream } = require('node:stream/web');
const { APPROVAL, runRemediation } = require('./historical-official-pdf-remediate.cjs');

const pdf = Buffer.from('%PDF-synthetic');
const response = (status) => ({ status, body: new ReadableStream({ start(c) { c.enqueue(pdf); c.close(); } }) });
function harness(overrides = {}) {
  const updates = [], acls = [];
  return {
    updates, acls,
    input: {
      approval: APPROVAL, cdnUrl: 'https://bucket.tor1.digitaloceanspaces.com', storageCredentials: { bucket: 'bucket', accessKey: 'a', secretKey: 's' },
      prisma: { project: { findMany: async () => [{ id: 'p', organizationId: 'o', officialPdfFr: 'https://bucket.tor1.digitaloceanspaces.com/documents/a.pdf', officialPdfEn: null, projectVersions: [{ id: 'v' }] }], updateMany: async (query) => { updates.push(query); return { count: 1 }; } } },
      storage: { downloadPrivate: async () => pdf, storeOfficialPdfImmutable: async () => 'coro-private:v1:opaque', downloadOfficialPdfReference: async () => pdf },
      setPrivateAcl: async (value) => acls.push(value.key),
      fetchImpl: async (_url, options) => response(options.headers ? 206 : 403),
      ...overrides,
    },
  };
}
test('fails closed without the exact approval or with a separate CDN', async () => {
  await assert.rejects(runRemediation(harness({ approval: 'NO' }).input), /APPROVAL_REQUIRED/);
  await assert.rejects(runRemediation(harness({ cdnUrl: 'https://cdn.example' }).input), /CDN_PURGE_AUTHORITY_REQUIRED/);
});
test('copies, verifies, updates references, revokes origin ACL and verifies anonymous denial', async () => {
  let calls = 0;
  const h = harness({ fetchImpl: async () => response(++calls === 1 ? 206 : 403) });
  const result = await runRemediation(h.input);
  assert.equal(result.migratedReferences, 1);
  assert.equal(h.updates.length, 1);
  assert.equal(h.acls.length, 1);
  assert.equal(h.updates[0].data.officialPdfFr, 'coro-private:v1:opaque');
});
test('does not update references when the private copy fails', async () => {
  const h = harness({ storage: { downloadPrivate: async () => pdf, storeOfficialPdfImmutable: async () => { throw new Error('write failed'); }, downloadOfficialPdfReference: async () => pdf } });
  await assert.rejects(runRemediation(h.input), /write failed/);
  assert.equal(h.updates.length, 0);
  assert.equal(h.acls.length, 0);
});
