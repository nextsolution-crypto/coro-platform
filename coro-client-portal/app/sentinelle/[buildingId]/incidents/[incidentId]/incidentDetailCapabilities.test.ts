import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEditIncidentRex,
  canShowIncidentActions,
  isIncidentAuthorizationError,
  normalizeIncidentDetailCapabilities,
} from './incidentDetailCapabilities.ts';

const readOnly = normalizeIncidentDetailCapabilities({ canRead: true });
const supervisor = normalizeIncidentDetailCapabilities({ canRead: true, canSupervise: true });
const commander = normalizeIncidentDetailCapabilities({ canRead: true, canCommand: true });

test('INCIDENT_READ alone exposes no mutation capability', () => {
  assert.equal(canShowIncidentActions('ACTIVE', readOnly), false);
  assert.equal(canEditIncidentRex(readOnly), false);
});

test('SUPERVISE permits REX editing but not command transitions', () => {
  assert.equal(canEditIncidentRex(supervisor), true);
  assert.equal(canShowIncidentActions('ACTIVE', supervisor), false);
});

test('COMMAND permits active and contained transitions only', () => {
  assert.equal(canShowIncidentActions('ACTIVE', commander), true);
  assert.equal(canShowIncidentActions('CONTAINED', commander), true);
  assert.equal(canShowIncidentActions('RESOLVED', commander), false);
});

test('a server denial revokes the corresponding client capability immediately', () => {
  assert.equal(canShowIncidentActions('ACTIVE', commander, true), false);
  assert.equal(canEditIncidentRex(supervisor, true), false);
  assert.equal(isIncidentAuthorizationError(403), true);
  assert.equal(isIncidentAuthorizationError(500), false);
});

test('missing or malformed capabilities fail closed', () => {
  assert.deepEqual(normalizeIncidentDetailCapabilities(null), {
    canRead: false,
    canParticipate: false,
    canSupervise: false,
    canCommand: false,
    canActivatePca: false,
  });
});
