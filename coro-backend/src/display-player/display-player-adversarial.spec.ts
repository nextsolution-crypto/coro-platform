import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalize, sha256, validateManifest } from './manifest-validator';
import { InMemoryAtomicPlayerCache } from './player-cache';
import {
  PlayerDeviceIdentity,
  SignedPlayerDisplayManifest,
  TrustedManifestKey,
} from './player-contracts';
import { GovernedModeController, scheduledContent } from './player-scheduler';

const clock = new Date('2030-01-15T12:00:00.000Z');
const device: PlayerDeviceIdentity = {
  deviceId: 'opaque-review-device',
  organizationId: 'org-review',
  buildingId: 'building-review',
  locationId: 'lobby-review',
  displayProfile: 'WIDESCREEN_16X9',
  softwareVersion: 'review',
};

function independentFixture() {
  const keys = generateKeyPairSync('ed25519');
  const document = Buffer.from('independent hostile review fixture');
  const payload: SignedPlayerDisplayManifest['payload'] = {
    schemaVersion: 1,
    manifestId: 'review-manifest-91',
    sequence: 91,
    assignmentId: 'assignment-review',
    organizationId: device.organizationId,
    buildingId: device.buildingId,
    locationId: device.locationId,
    publicationId: 'publication-review',
    documentVersionId: 'document-version-review',
    documentSha256: sha256(document),
    displayProfile: 'WIDESCREEN_16X9',
    width: 3840,
    height: 2160,
    issuedAt: '2030-01-15T11:00:00.000Z',
    reevaluateAt: '2030-01-16T11:00:00.000Z',
    knownRevoked: false,
    renderReference: 'private://review/render',
    policy: {
      planDurationSeconds: 40,
      communicationDurationSeconds: 10,
      safetyDurationSeconds: 10,
      allowApprovedSecondaryContent: true,
    },
  };
  const manifest: SignedPlayerDisplayManifest = {
    algorithm: 'Ed25519',
    keyId: 'review-key',
    payload,
    signature: sign(
      null,
      Buffer.from(canonicalize(payload)),
      keys.privateKey,
    ).toString('base64'),
  };
  const trustedKey: TrustedManifestKey = {
    keyId: 'review-key',
    publicKeyPem: keys.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString(),
    activeFrom: '2030-01-01T00:00:00.000Z',
  };
  return { document, manifest, trustedKey };
}

function review(
  manifest: SignedPlayerDisplayManifest,
  trustedKeys: TrustedManifestKey[],
  document?: Uint8Array,
) {
  return () =>
    validateManifest(manifest, {
      device,
      trustedKeys,
      now: clock,
      highestAcceptedSequence: 90,
      expectedAssignmentId: 'assignment-review',
      expectedDocument: document,
    });
}

describe('DISPLAY-06A independent adversarial review', () => {
  it('accepts property reordering because canonicalization is stable', () => {
    const fixture = independentFixture();
    fixture.manifest.payload = Object.fromEntries(
      Object.entries(fixture.manifest.payload).reverse(),
    ) as unknown as SignedPlayerDisplayManifest['payload'];
    expect(
      review(fixture.manifest, [fixture.trustedKey], fixture.document),
    ).not.toThrow();
  });

  it.each([
    [
      'truncated signature',
      (m: SignedPlayerDisplayManifest) =>
        (m.signature = m.signature.slice(0, 12)),
      'INVALID_SIGNATURE',
    ],
    [
      'unknown key',
      (m: SignedPlayerDisplayManifest) => (m.keyId = 'attacker-key'),
      'UNTRUSTED_KEY',
    ],
    [
      'wrong building',
      (m: SignedPlayerDisplayManifest) =>
        (m.payload.buildingId = 'other-building'),
      'DEVICE_SCOPE_MISMATCH',
    ],
    [
      'wrong location',
      (m: SignedPlayerDisplayManifest) =>
        (m.payload.locationId = 'other-location'),
      'DEVICE_SCOPE_MISMATCH',
    ],
    [
      'wrong profile',
      (m: SignedPlayerDisplayManifest) =>
        (m.payload.displayProfile = 'WIDESCREEN_16X10'),
      'INVALID_DISPLAY_GEOMETRY',
    ],
    [
      'assignment substitution',
      (m: SignedPlayerDisplayManifest) =>
        (m.payload.assignmentId = 'other-assignment'),
      'ASSIGNMENT_SUBSTITUTION',
    ],
    [
      'unsigned extra field',
      (m: SignedPlayerDisplayManifest) =>
        Object.assign(m.payload, { attacker: true }),
      'INVALID_SCHEMA',
    ],
    [
      'missing field',
      (m: SignedPlayerDisplayManifest) =>
        delete (m.payload as unknown as Record<string, unknown>).publicationId,
      'INVALID_SCHEMA',
    ],
    [
      'ambiguous number',
      (m: SignedPlayerDisplayManifest) => (m.payload.sequence = Number.NaN),
      'INVALID_SCHEMA',
    ],
    [
      'public render URL',
      (m: SignedPlayerDisplayManifest) =>
        (m.payload.renderReference = 'https://attacker.invalid/plan'),
      'INVALID_DISPLAY_POLICY',
    ],
  ])('refuses %s', (_label, mutate, error) => {
    const fixture = independentFixture();
    mutate(fixture.manifest);
    expect(
      review(fixture.manifest, [fixture.trustedKey], fixture.document),
    ).toThrow(error);
  });

  it('refuses revoked and expired signing keys independently of a valid signature', () => {
    const revoked = independentFixture();
    revoked.trustedKey.revokedAt = '2030-01-10T00:00:00.000Z';
    expect(review(revoked.manifest, [revoked.trustedKey])).toThrow(
      'REVOKED_SIGNING_KEY',
    );

    const expired = independentFixture();
    expired.trustedKey.expiresAt = '2030-01-10T00:00:00.000Z';
    expect(review(expired.manifest, [expired.trustedKey])).toThrow(
      'EXPIRED_SIGNING_KEY',
    );
  });

  it('refuses a replay, a truncated plan and an empty substitution', () => {
    const fixture = independentFixture();
    expect(() =>
      validateManifest(fixture.manifest, {
        device,
        trustedKeys: [fixture.trustedKey],
        now: clock,
        highestAcceptedSequence: 91,
      }),
    ).toThrow('REPLAY_OR_ROLLBACK');
    expect(
      review(
        fixture.manifest,
        [fixture.trustedKey],
        fixture.document.subarray(0, 5),
      ),
    ).toThrow('DOCUMENT_INTEGRITY_MISMATCH');
    expect(
      review(fixture.manifest, [fixture.trustedKey], Buffer.alloc(0)),
    ).toThrow('DOCUMENT_INTEGRITY_MISMATCH');
  });

  it('binds concurrent cache commits to their own stage tokens', async () => {
    const one = independentFixture();
    const two = independentFixture();
    two.manifest.payload.sequence = 92;
    two.manifest.payload.documentSha256 = sha256(
      Buffer.from('second valid plan'),
    );
    const cache = new InMemoryAtomicPlayerCache();
    const tokenOne = await cache.stage({
      manifest: one.manifest,
      bytes: one.document,
      cachedAt: clock.toISOString(),
    });
    const tokenTwo = await cache.stage({
      manifest: two.manifest,
      bytes: Buffer.from('second valid plan'),
      cachedAt: clock.toISOString(),
    });
    await cache.commit(tokenOne);
    expect((await cache.read())?.manifest.payload.sequence).toBe(91);
    await cache.commit(tokenTwo);
    expect((await cache.read())?.manifest.payload.sequence).toBe(92);
    await expect(cache.commit(tokenOne)).rejects.toThrow('INVALID_STAGE_TOKEN');
  });

  it('does not allow forged secondary content or emergency downgrade', () => {
    expect(
      scheduledContent({
        elapsedMs: 45_000,
        mode: 'NORMAL_CYCLE',
        now: clock,
        organizationId: device.organizationId,
        buildingId: device.buildingId,
        communication: {
          id: 'forged',
          kind: 'COMMUNICATION',
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          version: 99,
          authenticated: false,
          approved: true,
          revoked: false,
          validFrom: '2030-01-01T00:00:00.000Z',
          validUntil: '2031-01-01T00:00:00.000Z',
        },
      }),
    ).toBe('PLAN');
    const mode = new GovernedModeController();
    mode.raise('EMERGENCY_REAL');
    expect(() => mode.raise('EMERGENCY_EXERCISE')).toThrow(
      'LOWER_PRIORITY_REQUIRES_GOVERNED_CLEAR',
    );
    expect(mode.current()).toBe('EMERGENCY_REAL');
  });
});
