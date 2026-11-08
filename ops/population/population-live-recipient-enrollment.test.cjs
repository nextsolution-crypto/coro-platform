'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { APPROVAL, TARGET, assertAuthority, assertFoundation, assertOperator, safeErrorCode } = require('./population-live-recipient-enrollment.cjs');
const { TRANSPORT_APPROVAL, assertTransportScope, assertArmCampaign } = require('./population-live-recipient-enrollment.cjs');
const { createHash } = require('node:crypto');

const safeEnv = { CORO_POPULATION_RECIPIENT_ENROLLMENT: 'true', CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL: APPROVAL, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true' };

test('requires the exact authority and safe controlled-live state', () => {
  assert.doesNotThrow(() => assertAuthority('OPEN', safeEnv));
  assert.throws(() => assertAuthority('OPEN', { ...safeEnv, POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }), /SAFETY_STATE/);
  assert.throws(() => assertAuthority('OPEN', { ...safeEnv, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'true' }), /SAFETY_STATE/);
  assert.throws(() => assertAuthority('OPEN', { ...safeEnv, CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL: 'wrong' }), /APPROVAL/);
});

test('rejects another tenant, client, building or governance mode', () => {
  const environment = { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true };
  const program = { publicSlug: 'coro-sp-ops-04b-test', deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL', rueFacilityProfile: { buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224', building: { clientId: 'd3000001-0000-4000-8000-000000000002', organizationId: '916f54ec-af22-45e0-99db-a369d9630002' } } };
  assert.doesNotThrow(() => assertFoundation(environment, program));
  assert.throws(() => assertFoundation(environment, { ...program, governanceMode: 'STANDARD' }), /GOVERNANCE/);
  assert.throws(() => assertFoundation(environment, { ...program, rueFacilityProfile: { ...program.rueFacilityProfile, building: { ...program.rueFacilityProfile.building, organizationId: 'other' } } }), /SCOPE/);
});

test('requires the exact active internal operator authority', () => {
  const operator = { id: 'operator-1', email: TARGET.operatorEmail, organizationId: TARGET.organizationId, isActive: true, role: 'ADMIN' };
  assert.doesNotThrow(() => assertOperator(operator));
  assert.throws(() => assertOperator({ ...operator, email: 'other@example.test' }), /OPERATOR_INVALID/);
  assert.throws(() => assertOperator({ ...operator, organizationId: 'other' }), /OPERATOR_INVALID/);
  assert.throws(() => assertOperator({ ...operator, isActive: false }), /OPERATOR_INVALID/);
  assert.throws(() => assertOperator({ ...operator, role: 'OPERATOR' }), /OPERATOR_INVALID/);
});

test('only exposes allowlisted error codes', () => {
  assert.equal(safeErrorCode(new Error('QA_PROGRAM_SCOPE_INVALID')), 'QA_PROGRAM_SCOPE_INVALID');
  assert.equal(safeErrorCode(new Error('secret=value@example.test')), 'UNCLASSIFIED_ENROLLMENT_FAILURE');
});

function armFixture() {
  const now = Date.now(); const phone = '+15145550123'; const email = 'qa@example.invalid';
  const hash = value => createHash('sha256').update(value).digest('hex');
  const env = { ...safeEnv, CORO_POPULATION_CONTROLLED_TRANSPORT_APPROVAL: TRANSPORT_APPROVAL,
    POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID: TARGET.organizationId,
    POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID: TARGET.programId,
    POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID: 'pinned-alert',
    POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT: new Date(now + 1800000).toISOString(),
    POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: hash(phone), POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256: hash(email),
    POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS: '100',
    POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT: '20000',
    POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE: '0',
    POPULATION_SMS_PRODUCTION_VALIDATED: 'false', POPULATION_SMS_TFN_APPROVED: 'true',
    POPULATION_BREVO_EMAIL_SENDER_VERIFIED: 'true', BREVO_API_KEY: 'synthetic-only',
    BREVO_SMS_SENDER: '+18335886812', BREVO_SENDER_EMAIL: 'sender@example.invalid',
    POPULATION_BREVO_WEBHOOK_SECRET: 'e'.repeat(40), POPULATION_BREVO_SMS_WEBHOOK_SECRET: 's'.repeat(40),
  };
  const owner = { status: 'ACTIVE', isSynthetic: false, smsEnabled: true, emailEnabled: true, phoneCanonical: phone,
    email, emailCanonical: email, latitude: 45.5, longitude: -73.4, locationResolvedAt: new Date(now),
    consentEvents: [{ type: 'VERIFIED', consentVersion: 'QA', smsEnabled: true, emailEnabled: true }],
    smsConsentEvidence: [{ verifiedAt: new Date(now), consentVersion: 'QA', smsEnabled: true }],
    verifications: [{ channel: 'SMS', verifiedAt: new Date(now) }, { channel: 'EMAIL', verifiedAt: new Date(now) }] };
  const program = { consentVersion: 'QA', id: TARGET.programId, publicSlug: TARGET.publicSlug, status: 'ACTIVE', deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL',
    rueFacilityProfileId: 'qa-profile', rueFacilityProfile: { buildingId: TARGET.buildingId, building: { organizationId: TARGET.organizationId, clientId: TARGET.clientId } },
    subscribers: [owner] };
  const file = { organizationId: TARGET.organizationId, buildingId: TARGET.buildingId, visibility: 'shared', status: 'valide', lifecycleState: 'APPROVED' };
  const scenario = { isActive: true, facilityProfileId: 'qa-profile', dispersionReviewedAt: new Date(now), dispersionReviewedByType: 'CLIENT_USER', dispersionReviewedById: TARGET.approverId,
    dispersionSourceFile: file, impactZones: [{ isActive: true, approvedForAlerting: true, alertingApprovedAt: new Date(now), alertingApprovedByType: 'CLIENT_USER', alertingApprovedById: TARGET.approverId, purpose: 'PUBLIC_NOTIFICATION', maxDistanceKm: 1 }] };
  const alert = { id: 'pinned-alert', programId: TARGET.programId, type: 'TEST', status: 'DRAFT', createdByType: 'CLIENT_USER', createdById: TARGET.preparerId,
    institutionTargets: [], emergencyScenario: scenario };
  const actors = [
    { id: TARGET.preparerId, isActive: true, role: 'CLIENT_MANAGER', organizationId: TARGET.organizationId, clientId: TARGET.clientId, buildingIds: [TARGET.buildingId], populationPermissions: ['POPULATION_PREPARE', 'POPULATION_SEND'] },
    { id: TARGET.approverId, isActive: true, role: 'CLIENT_CORPORATE', organizationId: TARGET.organizationId, clientId: TARGET.clientId, buildingIds: [TARGET.buildingId], populationPermissions: ['POPULATION_APPROVE'] },
  ];
  return { now, env, program, alert, actors };
}

test('ARM prepares one pinned draft under STOP, DISARM can always close an enabled window', () => {
  const f = armFixture();
  assert.doesNotThrow(() => assertAuthority('ARM', f.env));
  assert.doesNotThrow(() => assertTransportScope(f.program, f.env));
  assert.doesNotThrow(() => assertArmCampaign(f.program, f.alert, f.actors, f.env, f.now));
  assert.throws(() => assertAuthority('ARM', { ...f.env, POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }));
  assert.doesNotThrow(() => assertAuthority('DISARM', { ...f.env, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'true', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }));
  assert.throws(() => assertAuthority('DISARM', { ...f.env, CORO_POPULATION_CONTROLLED_TRANSPORT_APPROVAL: 'wrong' }));
});

for (const [label, mutate] of [
  ['expired', f => f.env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT = new Date(f.now - 1).toISOString()],
  ['unbounded', f => f.env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT = new Date(f.now + 3600001).toISOString()],
  ['other alert', f => f.env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID = 'another'],
  ['already frozen', f => f.alert.recipientsFrozenAt = new Date()],
  ['second recipient', f => f.program.subscribers.push({ ...f.program.subscribers[0] })],
  ['unverified email', f => f.program.subscribers[0].verifications.pop()],
  ['different destination', f => f.program.subscribers[0].phoneCanonical = '+15145550124'],
  ['review by preparer', f => f.alert.emergencyScenario.dispersionReviewedById = TARGET.preparerId],
  ['expired source', f => f.alert.emergencyScenario.dispersionSourceFile.expiresAt = new Date(0)],
  ['unapproved zone', f => f.alert.emergencyScenario.impactZones[0].approvedForAlerting = false],
  ['inactive approver', f => f.actors[1].isActive = false],
  ['wrong TFN', f => f.env.BREVO_SMS_SENDER = 'CORO'],
  ['false production claim', f => f.env.POPULATION_SMS_PRODUCTION_VALIDATED = 'true'],
]) test(`ARM refuses ${label}`, () => {
  const f = armFixture(); mutate(f);
  assert.throws(() => assertArmCampaign(f.program, f.alert, f.actors, f.env, f.now));
});
