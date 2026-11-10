import { generateKeyPairSync, sign } from 'node:crypto';
import { decideOfflineDisplay } from './offline-policy';
import { canonicalize, sha256, validateManifest } from './manifest-validator';
import {
  InMemoryAtomicPlayerCache,
  replaceCachedPlanAtomically,
} from './player-cache';
import {
  PlayerDeviceIdentity,
  SecondaryContent,
  SignedPlayerDisplayManifest,
} from './player-contracts';
import { LocalPlayerJournal } from './player-journal';
import { GovernedModeController, scheduledContent } from './player-scheduler';

const now = new Date('2026-11-10T12:00:00.000Z');
const bytes = Buffer.from('approved evacuation plan');
const keyPair = generateKeyPairSync('ed25519');
const device: PlayerDeviceIdentity = {
  deviceId: 'dev_opaque_01',
  organizationId: 'org-1',
  buildingId: 'building-1',
  locationId: 'location-1',
  displayProfile: 'WIDESCREEN_16X9',
  softwareVersion: '0.1.0',
};

function manifest(
  overrides: Partial<SignedPlayerDisplayManifest['payload']> = {},
): SignedPlayerDisplayManifest {
  const payload: SignedPlayerDisplayManifest['payload'] = {
    schemaVersion: 1,
    manifestId: 'manifest-1',
    sequence: 7,
    assignmentId: 'assignment-1',
    organizationId: device.organizationId,
    buildingId: device.buildingId,
    locationId: device.locationId,
    publicationId: 'publication-1',
    documentVersionId: 'version-1',
    documentSha256: sha256(bytes),
    displayProfile: device.displayProfile,
    width: 1920,
    height: 1080,
    issuedAt: '2026-11-10T11:55:00.000Z',
    reevaluateAt: '2026-11-11T12:00:00.000Z',
    knownRevoked: false,
    renderReference: 'private://display-render/version-1',
    policy: {
      planDurationSeconds: 40,
      communicationDurationSeconds: 10,
      safetyDurationSeconds: 10,
      allowApprovedSecondaryContent: true,
    },
    ...overrides,
  };
  return {
    keyId: 'display-signing-2026-01',
    algorithm: 'Ed25519',
    payload,
    signature: sign(
      null,
      Buffer.from(canonicalize(payload)),
      keyPair.privateKey,
    ).toString('base64'),
  };
}

const trustedKeys = [
  {
    keyId: 'display-signing-2026-01',
    publicKeyPem: keyPair.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString(),
    activeFrom: '2026-01-01T00:00:00.000Z',
  },
];

describe('DISPLAY-06A player foundation', () => {
  it('accepts an authentic scoped manifest and matching plan', () => {
    expect(() =>
      validateManifest(manifest(), {
        device,
        trustedKeys,
        now,
        highestAcceptedSequence: 6,
        expectedDocument: bytes,
      }),
    ).not.toThrow();
  });

  it.each([
    ['replay', { sequence: 6 }, 'REPLAY_OR_ROLLBACK'],
    [
      'wrong tenant',
      { organizationId: 'org-attacker' },
      'DEVICE_SCOPE_MISMATCH',
    ],
    ['known revocation', { knownRevoked: true }, 'KNOWN_REVOKED'],
    [
      'future issue',
      {
        issuedAt: '2026-11-12T00:00:00.000Z',
        reevaluateAt: '2026-11-13T00:00:00.000Z',
      },
      'CLOCK_OR_FUTURE_MANIFEST',
    ],
  ])('rejects %s', (_label, overrides, expected) => {
    expect(() =>
      validateManifest(manifest(overrides), {
        device,
        trustedKeys,
        now,
        highestAcceptedSequence: 6,
        expectedDocument: bytes,
      }),
    ).toThrow(expected);
  });

  it('rejects substitution and signing-key tampering', () => {
    const signed = manifest();
    signed.payload.publicationId = 'substituted';
    expect(() =>
      validateManifest(signed, {
        device,
        trustedKeys,
        now,
        highestAcceptedSequence: 6,
      }),
    ).toThrow('INVALID_SIGNATURE');
    expect(() =>
      validateManifest(manifest(), {
        device,
        trustedKeys,
        now,
        highestAcceptedSequence: 6,
        expectedDocument: Buffer.from('tampered'),
      }),
    ).toThrow('DOCUMENT_INTEGRITY_MISMATCH');
  });

  it('keeps the last valid plan when an atomic replacement is corrupt', async () => {
    const cache = new InMemoryAtomicPlayerCache();
    const first = { manifest: manifest(), bytes, cachedAt: now.toISOString() };
    await replaceCachedPlanAtomically(cache, first);
    const bad = { ...first, bytes: Buffer.from('corrupt') };
    await expect(replaceCachedPlanAtomically(cache, bad)).rejects.toThrow(
      'DOCUMENT_INTEGRITY_MISMATCH',
    );
    expect(await cache.read()).toBe(first);
  });

  it('continues offline with a verified plan and reports stale freshness explicitly', () => {
    const cached = { manifest: manifest(), bytes, cachedAt: now.toISOString() };
    expect(decideOfflineDisplay(cached, now)).toEqual({
      displayPlan: true,
      reason: 'NETWORK_UNAVAILABLE',
      freshnessConfirmed: true,
    });
    expect(
      decideOfflineDisplay(cached, new Date('2026-11-12T00:00:00.000Z')),
    ).toEqual({
      displayPlan: true,
      reason: 'FRESHNESS_UNCONFIRMED',
      freshnessConfirmed: false,
    });
    expect(decideOfflineDisplay(null, now).displayPlan).toBe(false);
  });

  it('implements the deterministic 40/10/10 cycle and falls back to the plan', () => {
    const secondary = (kind: 'COMMUNICATION' | 'SAFETY'): SecondaryContent => ({
      id: kind,
      kind,
      organizationId: device.organizationId,
      buildingId: device.buildingId,
      version: 1,
      approved: true,
      revoked: false,
      validFrom: '2026-11-10T00:00:00.000Z',
      validUntil: '2026-11-11T00:00:00.000Z',
    });
    const base = {
      mode: 'NORMAL_CYCLE' as const,
      now,
      organizationId: device.organizationId,
      buildingId: device.buildingId,
      communication: secondary('COMMUNICATION'),
      safety: secondary('SAFETY'),
    };
    expect(scheduledContent({ ...base, elapsedMs: 39_999 })).toBe('PLAN');
    expect(scheduledContent({ ...base, elapsedMs: 40_000 })).toBe(
      'COMMUNICATION',
    );
    expect(scheduledContent({ ...base, elapsedMs: 50_000 })).toBe('SAFETY');
    expect(scheduledContent({ ...base, elapsedMs: 60_000 })).toBe('PLAN');
    expect(
      scheduledContent({
        ...base,
        elapsedMs: 40_000,
        communication: undefined,
      }),
    ).toBe('PLAN');
    expect(
      scheduledContent({
        ...base,
        elapsedMs: 50_000,
        safety: { ...secondary('SAFETY'), approved: false },
      }),
    ).toBe('PLAN');
  });

  it.each(['PERMANENT_PLAN', 'EMERGENCY_EXERCISE', 'EMERGENCY_REAL'] as const)(
    'devotes 100%% to the plan in %s',
    (mode) => {
      expect(
        scheduledContent({
          mode,
          elapsedMs: 45_000,
          now,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
        }),
      ).toBe('PLAN');
    },
  );

  it('requires governed clearance from emergency and never auto-resets it', () => {
    const controller = new GovernedModeController();
    controller.raise('EMERGENCY_EXERCISE');
    controller.raise('EMERGENCY_REAL');
    expect(controller.current()).toBe('EMERGENCY_REAL');
    expect(() => controller.raise('NORMAL_CYCLE')).toThrow(
      'LOWER_PRIORITY_REQUIRES_GOVERNED_CLEAR',
    );
    expect(() => controller.clearTo('NORMAL_CYCLE', false)).toThrow(
      'GOVERNED_CLEAR_REQUIRED',
    );
    controller.clearTo('PERMANENT_PLAN', true);
    expect(controller.current()).toBe('PERMANENT_PLAN');
  });

  it('maintains a bounded append-only local journal without secrets', () => {
    const journal = new LocalPlayerJournal(2);
    journal.append('START', now);
    journal.append('NETWORK_LOST', new Date(now.getTime() + 1_000), 'OFFLINE');
    journal.append('NETWORK_RESTORED', new Date(now.getTime() + 2_000));
    expect(journal.read()).toHaveLength(2);
    expect(journal.read().map((event) => event.sequence)).toEqual([2, 3]);
    expect(JSON.stringify(journal.read())).not.toContain('secret');
  });
});
