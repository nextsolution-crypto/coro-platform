'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertApproval, assertAccidentalFixture, assertQaCollision, signHs256 } = require('./client-email-qa-remediate.cjs');

const client = {
  id: '3a4fa159-7957-4240-b9c0-1194d034c654', name: 'CORO QA V1 EMAIL 2026-10-26',
  contactEmail: 'info@getcoro.io', contactFirstName: 'Recette', contactLastName: 'CORO V1', buildings: [], projects: [],
  organizationId: 'org-current',
};
const user = {
  id: 'qa-user', email: 'info@getcoro.io', clientId: client.id, organizationId: client.organizationId,
  firstName: 'Recette', lastName: 'CORO V1', role: 'CLIENT_CORPORATE', isActive: true, buildingIds: [],
  createdAt: new Date('2026-10-26T15:58:00.000Z'),
};

test('requires the exact two-part execution approval', () => {
  assert.throws(() => assertApproval({}), /approval/);
  assert.doesNotThrow(() => assertApproval({
    CLIENT_EMAIL_QA_REMEDIATION_RUN: 'true',
    CLIENT_EMAIL_QA_REMEDIATION_APPROVAL: 'REMEDIATE_CLIENT_EMAIL_QA_2026_10_26',
  }));
});

test('accepts only the exact empty accidental fixture', () => {
  assert.doesNotThrow(() => assertAccidentalFixture(client, user, new Date('2026-10-26T16:30:00.000Z')));
  assert.throws(() => assertAccidentalFixture({ ...client, buildings: [{ id: 'real' }] }, user), /identity or emptiness/);
  assert.throws(() => assertAccidentalFixture(client, { ...user, role: 'CLIENT_MANAGER' }), /ClientUser identity/);
  assert.throws(() => assertAccidentalFixture(client, { ...user, createdAt: new Date('2026-10-25') }), /creation window/);
});

test('fails closed on reserved QA identifier collisions', () => {
  assert.doesNotThrow(() => assertQaCollision(null, 'expected', 'QA organization'));
  assert.doesNotThrow(() => assertQaCollision({ name: 'expected' }, 'expected', 'QA organization'));
  assert.throws(() => assertQaCollision({ name: 'other' }, 'expected', 'QA organization'), /collision/);
});

test('creates a five-minute HS256 proof token without external JWT options', () => {
  const token = signHs256({ sub: 'qa-user', sessionVersion: 0 }, 'test-secret', 1000);
  const [header, payload, signature] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url')), {
    sub: 'qa-user', sessionVersion: 0, iat: 1000, exp: 1300,
  });
  assert.ok(signature.length > 20);
});
