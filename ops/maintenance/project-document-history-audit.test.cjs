'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { anonymousProbe, classifyReference, runInventory, runReadOnlyInventory, safeStorageKey } = require('./project-document-history-audit.cjs');

const origins = new Set(['https://cdn.example']);
const request = (responses) => async (_url, options) => {
  const next = responses.shift();
  assert.equal(options.method, next.method);
  return next.result;
};

test('accepts unambiguous keys and rejects traversal, schemes and ambiguity', () => {
  assert.equal(safeStorageKey('tenant-a/file.pdf'), true);
  for (const value of ['', '/root', '../x', 'a/../b', 'https://evil/x', 'a\\b', 'a/%2e%2e/b', 'a/%ZZ/b']) assert.equal(safeStorageKey(value), false);
});

test('classifies canonical, historical, signed, external and invalid references', () => {
  assert.equal(classifyReference('coro-private:v1:YWJj', null, origins).format, 'canonicalPrivate');
  assert.equal(classifyReference('https://cdn.example/documents/a.pdf', null, origins).format, 'historicalHttps');
  assert.equal(classifyReference(null, 'tenant-a/a.pdf', origins).format, 'historicalKey');
  assert.equal(classifyReference('https://cdn.example/a.pdf?sig=x', null, origins).format, 'signedUrl');
  assert.equal(classifyReference('https://evil.example/a.pdf', null, origins).format, 'external');
  assert.equal(classifyReference('javascript:alert(1)', null, origins).format, 'invalid');
});

test('confirms public only after a bounded 206 range and never follows redirects', async () => {
  assert.equal(await anonymousProbe('https://cdn.example/a', request([
    { method: 'HEAD', result: { status: 200, headers: {}, bytesRead: 0 } },
    { method: 'GET', result: { status: 206, headers: { 'content-range': 'bytes 0-15/100' }, bytesRead: 16 } },
  ])), 'PUBLIC');
  assert.equal(await anonymousProbe('https://cdn.example/a', request([
    { method: 'HEAD', result: { status: 302, headers: { location: 'https://elsewhere' }, bytesRead: 0 } },
  ])), 'NOT_VERIFIED');
});

test('fails honest on private, absent, timeout and range-ignoring servers', async () => {
  assert.equal(await anonymousProbe('https://cdn.example/a', request([{ method: 'HEAD', result: { status: 403, headers: {}, bytesRead: 0 } }])), 'DENIED');
  assert.equal(await anonymousProbe('https://cdn.example/a', request([{ method: 'HEAD', result: { status: 404, headers: {}, bytesRead: 0 } }])), 'MISSING');
  assert.equal(await anonymousProbe('https://cdn.example/a', request([{ method: 'HEAD', result: { status: 0, headers: {}, bytesRead: 0 } }])), 'NOT_VERIFIED');
  assert.equal(await anonymousProbe('https://cdn.example/a', request([
    { method: 'HEAD', result: { status: 200, headers: {}, bytesRead: 0 } },
    { method: 'GET', result: { status: 200, headers: {}, bytesRead: 16 } },
  ])), 'NOT_VERIFIED');
  assert.equal(await anonymousProbe('https://cdn.example/a', request([
    { method: 'HEAD', result: { status: 405, headers: {}, bytesRead: 0 } },
    { method: 'GET', result: { status: 206, headers: { 'content-range': 'bytes 0-15/20' }, bytesRead: 16 } },
  ])), 'PUBLIC');
});

test('paginates, deduplicates and emits only reconciled aggregate evidence', async () => {
  const files = [
    { id: '1', parentId: null, storageKey: 'documents/a.pdf', url: 'https://cdn.example/documents/a.pdf', project: { isActive: true, status: 'ACTIVE' } },
    { id: '2', parentId: '1', storageKey: 'documents/a.pdf', url: 'https://cdn.example/documents/a.pdf', project: { isActive: false, status: 'ARCHIVED' } },
    { id: '3', parentId: null, storageKey: 'tenant-a/private.pdf', url: '', project: { isActive: true, status: 'ACTIVE' } },
    { id: '4', parentId: null, storageKey: 'https://evil', url: '', project: { isActive: true, status: 'ACTIVE' } },
  ];
  const prisma = {
    projectFile: { findMany: async (query) => query.cursor ? [] : files },
    project: { findMany: async (query) => query.cursor ? [] : [{ id: 'p', officialPdfFr: 'https://cdn.example/documents/missing.pdf', officialPdfEn: null, isActive: true, status: 'ACTIVE' }] },
  };
  const report = await runInventory({
    prisma, allowedOrigins: origins,
    serviceHead: async (key) => key.includes('missing') ? 'MISSING' : 'EXISTS',
    publicUrlForKey: (key) => `https://cdn.example/${key}`,
    probe: async (url) => url.includes('private') ? 'DENIED' : 'PUBLIC',
  });
  assert.equal(report.coverage.references, 5);
  assert.equal(report.coverage.uniqueObjects, 3);
  assert.equal(report.duplicateReferences, 1);
  assert.equal(report.classifications.PUBLIC_EXPOSURE_CONFIRMED, 2);
  assert.equal(report.classifications.PRIVATE_ACCESS_VERIFIED, 1);
  assert.equal(report.classifications.MISSING_OR_BROKEN, 1);
  assert.equal(report.classifications.INVALID_REFERENCE, 1);
  assert.equal(report.coverage.projectFileVersions, 1);
  assert.equal(report.coverage.archivedOrInactive, 1);
  assert.doesNotMatch(JSON.stringify(report), /documents\/a|tenant-a|cdn\.example|projectId|organizationId/);
});

test('enforces a PostgreSQL read-only transaction before inventory access', async () => {
  const calls = [];
  const transaction = {
    $executeRawUnsafe: async (statement) => calls.push(statement),
    projectFile: { findMany: async () => [] },
    project: { findMany: async () => [] },
  };
  const prisma = {
    $transaction: async (callback, options) => {
      calls.push(options);
      return callback(transaction);
    },
  };

  const report = await runReadOnlyInventory({
    prisma,
    allowedOrigins: origins,
    serviceHead: async () => 'EXISTS',
    publicUrlForKey: () => null,
  });

  assert.equal(calls[0].timeout, 300_000);
  assert.equal(calls[1], 'SET TRANSACTION READ ONLY');
  assert.equal(report.readOnly, true);
  assert.equal(report.coverage.references, 0);
});
