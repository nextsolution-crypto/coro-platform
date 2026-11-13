'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { normalize, run, failureCode } = require('./display09-building-identity.cjs');

test('normalizes accents without weakening exact normalized matching', () => assert.equal(normalize('  Montréal '), 'montreal'));
test('uses a read-only transaction, exact tenant/client/building and secure evidence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'display09-'));
  const evidence = path.join(dir, 'evidence.json');
  const tx = {
    $executeRawUnsafe: async (sql) => assert.equal(sql, 'SET TRANSACTION READ ONLY'),
    $queryRawUnsafe: async (sql) => { assert.equal(sql, 'SHOW transaction_read_only'); return [{ transaction_read_only: 'on' }]; },
    client: { findMany: async () => [{ id: 'client-1', name: 'Groupe Immobilier Prémont', isActive: true }] },
    building: { findMany: async () => [{ id: 'building-1', clientId: 'client-1', name: 'Tour Prémont', address: '1200 boulevard Robert-Bourassa', city: 'Montréal', province: 'QC', isActive: true, _count: { displayLocations: 0 } }] },
    organization: { findUnique: async () => ({ id: '916f54ec-af22-45e0-99db-a369d9630002', name: 'CORO Démo', isActive: true, isInternal: false, licenseType: 'ESSAI_GRATUIT', demoEnvironment: { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true } }) },
    user: { findMany: async () => [{ id: 'u', displayPermissions: ['DISPLAY_READ'] }] },
    clientUser: { findMany: async () => [] },
  };
  const prisma = { $transaction: async (fn) => fn(tx) };
  const report = await run(prisma, evidence);
  assert.equal(report.execution, 'PASS');
  assert.equal(report.buildingCardinality, 1);
  assert.equal(report.displayAuthorityCount, 1);
  assert.equal(report.displayAuthorityConfirmed, true);
  assert.equal(report.clientActive, true);
  assert.equal(JSON.parse(fs.readFileSync(evidence, 'utf8')).buildingId, 'building-1');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('refuses PASS when the Display authority is absent', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'display09-no-authority-'));
  const tx = {
    $executeRawUnsafe: async () => undefined,
    $queryRawUnsafe: async () => [{ transaction_read_only: 'on' }],
    client: { findMany: async () => [{ id: 'client-1', name: 'Groupe Immobilier Prémont', isActive: true }] },
    building: { findMany: async () => [{ id: 'building-1', clientId: 'client-1', name: 'Tour Prémont', address: '1200 boulevard Robert-Bourassa', city: 'Montréal', province: 'QC', isActive: true, _count: { displayLocations: 0 } }] },
    organization: { findUnique: async () => ({ id: '916f54ec-af22-45e0-99db-a369d9630002', name: 'CORO Démo', isActive: true, isInternal: false, demoEnvironment: { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true } }) },
    user: { findMany: async () => [] }, clientUser: { findMany: async () => [] },
  };
  const report = await run({ $transaction: async (fn) => fn(tx) }, path.join(dir, 'evidence.json'));
  assert.equal(report.execution, 'FAILED');
  assert.equal(report.displayAuthorityConfirmed, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('refuses execution when PostgreSQL does not confirm READ ONLY', async () => {
  const tx = {
    $executeRawUnsafe: async () => undefined,
    $queryRawUnsafe: async () => [{ transaction_read_only: 'off' }],
  };
  await assert.rejects(
    () => run({ $transaction: async (fn) => fn(tx) }, path.join(os.tmpdir(), 'display09-unwritten.json')),
    /READ_ONLY_TRANSACTION_NOT_CONFIRMED/,
  );
});

test('classifies failures without exposing database messages', () => {
  assert.equal(failureCode({ code: 'P2021', message: 'sensitive table detail' }), 'PRISMA_P2021');
  assert.equal(failureCode(new TypeError('sensitive runtime detail')), 'UNEXPECTED_TYPEERROR');
});
