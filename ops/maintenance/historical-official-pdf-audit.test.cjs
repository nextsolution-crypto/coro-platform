'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { ReadableStream } = require('node:stream/web');
const { anonymousProbe, runAudit, safeLegacyKey } = require('./historical-official-pdf-audit.cjs');

function response(status, bytes = '') {
  return { status, body: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(bytes)); controller.close(); } }) };
}

test('accepts only the configured CORO CDN documents namespace', () => {
  assert.equal(safeLegacyKey('https://cdn.example/documents/a.pdf', 'https://cdn.example').key, 'documents/a.pdf');
  assert.throws(() => safeLegacyKey('https://evil.example/documents/a.pdf', 'https://cdn.example'));
  assert.throws(() => safeLegacyKey('https://cdn.example/documents/../secret', 'https://cdn.example'));
  assert.throws(() => safeLegacyKey('https://cdn.example/documents/a.pdf?token=x', 'https://cdn.example'));
});

test('classifies an anonymous PDF response without following redirects', async () => {
  assert.equal(await anonymousProbe('https://cdn.example/documents/a.pdf', async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Range, 'bytes=0-15');
    return response(206, '%PDF-1.7');
  }), 'PUBLIC');
  assert.equal(await anonymousProbe('https://cdn.example/documents/a.pdf', async () => response(403)), 'PRIVATE');
  assert.equal(await anonymousProbe('https://cdn.example/documents/a.pdf', async () => response(302)), 'UNVERIFIABLE');
});

test('returns aggregate evidence only and checks objects through canonical storage', async () => {
  const storage = {
    downloadOfficialPdfReference: async () => Buffer.from('%PDF-private'),
    downloadPrivate: async () => Buffer.from('%PDF-legacy'),
  };
  const report = await runAudit({
    prisma: { project: { findMany: async () => [{ officialPdfFr: 'coro-private:v1:opaque', officialPdfEn: 'https://cdn.example/documents/legacy.pdf' }] } },
    storage,
    cdnUrl: 'https://cdn.example',
    fetchImpl: async () => response(206, '%PDF-1.7'),
  });
  assert.deepEqual(report.formats, { canonicalPrivate: 1, historicalHttps: 1, unsupported: 0 });
  assert.deepEqual(report.objects, { private: 1, public: 1, missingOrBroken: 0, unverifiable: 0 });
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /opaque|legacy\.pdf|cdn\.example/);
});

test('requires an explicit runtime switch when delivered through stdin', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, 'historical-official-pdf-audit.cjs'),
    'utf8',
  );
  assert.match(source, /CORO_HISTORICAL_PDF_AUDIT_RUN === 'true'/);
});
