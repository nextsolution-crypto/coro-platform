import { generateKeyPairSync, sign } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canonicalize,
  sha256,
  validateManifest,
} from '../display-player/manifest-validator';
import {
  PlayerDeviceIdentity,
  SignedPlayerDisplayManifest,
} from '../display-player/player-contracts';
import {
  DeviceAuthenticator,
  DeviceRegistry,
  deviceEnrollmentStatement,
} from './device-security';
import {
  validateKioskArguments,
  validateKioskLaunchConfiguration,
} from './kiosk-policy';
import { EmergencyStateStore, PersistentPlanCache } from './persistent-runtime';
import {
  authenticateSecondaryContent,
  SignedSecondaryContent,
  validateTrustBundle,
} from './trust-and-content';

const clock = new Date('2032-04-05T12:00:00.000Z');

function deviceRecord(registry: DeviceRegistry, deviceId = 'device-a') {
  return registry.register(
    {
      deviceId,
      organizationId: 'org-a',
      buildingId: 'building-a',
      locationId: 'location-a',
      displayProfile: 'WIDESCREEN_16X9',
      displayName: 'Adversarial fixture',
    },
    clock,
  );
}

function enrollmentProof(registry: DeviceRegistry, deviceId = 'device-a') {
  deviceRecord(registry, deviceId);
  const keys = generateKeyPairSync('ed25519');
  const publicKeyPem = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const keyId = `key-${deviceId}`;
  const invitation = registry.createInvitation(deviceId, clock, {
    keyId,
    publicKeyPem,
  });
  const proof = {
    invitationId: invitation.invitationId,
    token: invitation.token,
    deviceId,
    keyId,
    publicKeyPem,
    signature: '',
  };
  proof.signature = sign(
    null,
    deviceEnrollmentStatement(proof),
    keys.privateKey,
  ).toString('base64');
  return { invitation, keys, proof };
}

function cacheManifest(
  bytes: Uint8Array,
  sequence: number,
  documentVersionId = `version-${sequence}`,
): SignedPlayerDisplayManifest {
  return {
    algorithm: 'Ed25519',
    keyId: 'synthetic-key',
    signature: 'synthetic-signature',
    payload: {
      schemaVersion: 1,
      manifestId: `manifest-${sequence}`,
      sequence,
      assignmentId: 'assignment-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      locationId: 'location-a',
      publicationId: `publication-${sequence}`,
      documentVersionId,
      documentSha256: sha256(bytes),
      displayProfile: 'WIDESCREEN_16X9',
      width: 1920,
      height: 1080,
      issuedAt: clock.toISOString(),
      reevaluateAt: new Date(clock.getTime() + 60_000).toISOString(),
      knownRevoked: false,
      renderReference: `private://render/${sequence}`,
      policy: {
        planDurationSeconds: 40,
        communicationDurationSeconds: 10,
        safetyDurationSeconds: 10,
        allowApprovedSecondaryContent: true,
      },
    },
  };
}

describe('DISPLAY-06B independent adversarial review', () => {
  it('consumes an invitation once under concurrent attempts and invalidates replaced invitations', async () => {
    const registry = new DeviceRegistry();
    const first = enrollmentProof(registry);
    const attackerKeys = generateKeyPairSync('ed25519');
    const attackerProof = {
      ...first.proof,
      keyId: 'attacker-key',
      publicKeyPem: attackerKeys.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      signature: '',
    };
    attackerProof.signature = sign(
      null,
      deviceEnrollmentStatement(attackerProof),
      attackerKeys.privateKey,
    ).toString('base64');
    expect(() => registry.enroll(attackerProof, clock)).toThrow(
      'INVITATION_SCOPE_MISMATCH',
    );
    const keys = generateKeyPairSync('ed25519');
    const replacementPublicKeyPem = keys.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    const replacement = registry.createInvitation('device-a', clock, {
      keyId: 'replacement-key',
      publicKeyPem: replacementPublicKeyPem,
    });
    expect(() => registry.enroll(first.proof, clock)).toThrow(
      'INVITATION_INVALID_OR_USED',
    );

    const proof = {
      invitationId: replacement.invitationId,
      token: replacement.token,
      deviceId: 'device-a',
      keyId: 'replacement-key',
      publicKeyPem: replacementPublicKeyPem,
      signature: '',
    };
    proof.signature = sign(
      null,
      deviceEnrollmentStatement(proof),
      keys.privateKey,
    ).toString('base64');
    const attempts = await Promise.allSettled([
      Promise.resolve().then(() => registry.enroll(proof, clock)),
      Promise.resolve().then(() => registry.enroll(proof, clock)),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('binds signed requests to operation and preserves replay state across an explicit restart snapshot', () => {
    const registry = new DeviceRegistry();
    const { keys, proof } = enrollmentProof(registry);
    const device = registry.enroll(proof, clock);
    const request = {
      deviceId: device.deviceId,
      timestamp: clock.toISOString(),
      nonce: 'review-nonce-0001',
      method: 'POST',
      path: '/device/sync',
      bodySha256: sha256(Buffer.from('body-a')),
      signature: '',
    };
    request.signature = sign(
      null,
      Buffer.from(
        [
          'CORO-DISPLAY-REQUEST',
          request.deviceId,
          request.timestamp,
          request.nonce,
          request.method,
          request.path,
          request.bodySha256,
        ].join('\n'),
      ),
      keys.privateKey,
    ).toString('base64');
    const firstProcess = new DeviceAuthenticator();
    firstProcess.authenticate(device, request, clock);
    const restarted = new DeviceAuthenticator(firstProcess.snapshot(clock));
    expect(() => restarted.authenticate(device, request, clock)).toThrow(
      'DEVICE_REQUEST_REPLAY',
    );
    expect(() =>
      new DeviceAuthenticator().authenticate(
        device,
        { ...request, path: '/device/other-operation' },
        clock,
      ),
    ).toThrow('DEVICE_REQUEST_SIGNATURE_INVALID');
  });

  it('rejects a falsified, rolled back, future or wrong-root trust bundle', () => {
    const root = generateKeyPairSync('ed25519');
    const otherRoot = generateKeyPairSync('ed25519');
    const payload = {
      version: 4,
      issuedAt: clock.toISOString(),
      keys: [],
      signerKeyId: 'root-a',
    };
    const bundle = {
      ...payload,
      signature: sign(
        null,
        Buffer.from(canonicalize(payload)),
        root.privateKey,
      ).toString('base64'),
    };
    const rootPem = root.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    expect(() =>
      validateTrustBundle(bundle, 3, rootPem, {
        expectedSignerKeyId: 'root-a',
        now: clock,
      }),
    ).not.toThrow();
    expect(() => validateTrustBundle(bundle, 4, rootPem)).toThrow(
      'TRUST_BUNDLE_ROLLBACK',
    );
    expect(() =>
      validateTrustBundle(
        bundle,
        3,
        otherRoot.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      ),
    ).toThrow('TRUST_BUNDLE_SIGNATURE_INVALID');
    expect(() =>
      validateTrustBundle(
        {
          ...bundle,
          issuedAt: new Date(clock.getTime() + 1).toISOString(),
        },
        3,
        rootPem,
        { now: clock },
      ),
    ).toThrow('TRUST_BUNDLE_TIME_INVALID');
  });

  it('isolates signed manifests for three organizations, buildings and locations', () => {
    const keys = generateKeyPairSync('ed25519');
    const trustedKey = {
      keyId: 'multi-tenant-key',
      publicKeyPem: keys.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      activeFrom: new Date(clock.getTime() - 60_000).toISOString(),
    };
    const fixtures = ['a', 'b', 'c'].map((suffix, index) => {
      const bytes = Buffer.from(`tenant-${suffix}`);
      const manifest = cacheManifest(bytes, index + 1);
      Object.assign(manifest.payload, {
        assignmentId: `assignment-${suffix}`,
        organizationId: `org-${suffix}`,
        buildingId: `building-${suffix}`,
        locationId: `location-${suffix}`,
      });
      manifest.keyId = trustedKey.keyId;
      manifest.signature = sign(
        null,
        Buffer.from(canonicalize(manifest.payload)),
        keys.privateKey,
      ).toString('base64');
      const device: PlayerDeviceIdentity = {
        deviceId: `device-${suffix}`,
        organizationId: `org-${suffix}`,
        buildingId: `building-${suffix}`,
        locationId: `location-${suffix}`,
        displayProfile: 'WIDESCREEN_16X9',
        softwareVersion: 'review',
      };
      return { bytes, device, manifest };
    });
    for (const fixture of fixtures) {
      expect(() =>
        validateManifest(fixture.manifest, {
          device: fixture.device,
          trustedKeys: [trustedKey],
          now: clock,
          highestAcceptedSequence: 0,
          expectedAssignmentId: fixture.manifest.payload.assignmentId,
          expectedDocument: fixture.bytes,
        }),
      ).not.toThrow();
    }
    expect(() =>
      validateManifest(fixtures[1].manifest, {
        device: fixtures[0].device,
        trustedKeys: [trustedKey],
        now: clock,
        highestAcceptedSequence: 0,
        expectedAssignmentId: fixtures[1].manifest.payload.assignmentId,
        expectedDocument: fixtures[1].bytes,
      }),
    ).toThrow('DEVICE_SCOPE_MISMATCH');
  });

  it('serializes cache commits, rejects rollback and refuses revoked fallback generations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'display-06b-review-cache-'));
    try {
      const verifier = (manifest: SignedPlayerDisplayManifest) => {
        if (manifest.signature !== 'synthetic-signature')
          throw new Error('CACHE_MANIFEST_UNTRUSTED');
      };
      const cacheA = new PersistentPlanCache(
        root,
        'device-a',
        'location-a',
        verifier,
      );
      const cacheB = new PersistentPlanCache(
        root,
        'device-a',
        'location-a',
        verifier,
      );
      const oldBytes = Buffer.from('older');
      const newBytes = Buffer.from('newer');
      const outcomes = await Promise.allSettled([
        cacheA.commit(cacheManifest(newBytes, 2), newBytes, clock),
        cacheB.commit(cacheManifest(oldBytes, 1), oldBytes, clock),
      ]);
      expect(
        outcomes.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect((await cacheA.readVerified())?.manifest.payload.sequence).toBe(2);
      const latestBytes = Buffer.from('latest');
      await cacheA.commit(cacheManifest(latestBytes, 3), latestBytes, clock);
      await writeFile(
        join(root, 'device-a', 'location-a', 'current', 'plan.bin'),
        'corrupt-current',
      );
      expect(
        await cacheA.readVerified({
          revokedDocumentVersionIds: new Set(['version-2']),
        }),
      ).toBeNull();
      const authenticatedBytes = Buffer.from('authenticated-latest');
      await cacheA.commit(
        cacheManifest(authenticatedBytes, 4),
        authenticatedBytes,
        clock,
      );
      const metadataPath = join(
        root,
        'device-a',
        'location-a',
        'current',
        'metadata.json',
      );
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
        manifest: SignedPlayerDisplayManifest;
      };
      metadata.manifest.signature = 'attacker-signature';
      await writeFile(metadataPath, JSON.stringify(metadata));
      expect(await cacheA.readVerified()).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses traversal identifiers and symbolic cache files', async () => {
    expect(
      () =>
        new PersistentPlanCache('cache', '..', 'location-a', () => undefined),
    ).toThrow('INVALID_CACHE_SCOPE');
    expect(
      () => new PersistentPlanCache('cache', 'device-a', '.', () => undefined),
    ).toThrow('INVALID_CACHE_SCOPE');
    const root = await mkdtemp(join(tmpdir(), 'display-06b-review-link-'));
    try {
      const target = join(root, 'outside.bin');
      const current = join(root, 'device-a', 'location-a', 'current');
      await mkdir(current, { recursive: true });
      await writeFile(target, 'attacker-controlled');
      await symlink(target, join(current, 'plan.bin'), 'file');
      await writeFile(
        join(current, 'metadata.json'),
        JSON.stringify({
          manifest: cacheManifest(Buffer.from('attacker-controlled'), 1),
          cachedAt: clock.toISOString(),
        }),
      );
      await expect(
        new PersistentPlanCache(
          root,
          'device-a',
          'location-a',
          () => undefined,
        ).readVerified(),
      ).rejects.toThrow('CACHE_SYMBOLIC_PATH_FORBIDDEN');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves emergency priority across concurrent writes and requires a governed clear', async () => {
    const root = await mkdtemp(join(tmpdir(), 'display-06b-review-emergency-'));
    try {
      const path = join(root, 'state.json');
      const key = Buffer.alloc(32, 9);
      const storeA = new EmergencyStateStore(path, key);
      const storeB = new EmergencyStateStore(path, key);
      const real = {
        mode: 'EMERGENCY_REAL' as const,
        eventId: 'event-real',
        source: 'LOCAL_SYNTHETIC' as const,
        priority: 3,
        occurredAt: clock.toISOString(),
        version: 1,
        authorizationId: 'auth-real',
      };
      await storeA.write(real);
      await expect(
        storeB.write({
          ...real,
          mode: 'EMERGENCY_EXERCISE',
          eventId: 'event-exercise',
          priority: 2,
          version: 2,
        }),
      ).rejects.toThrow('EMERGENCY_GOVERNED_CLEAR_REQUIRED');
      await storeB.write(
        {
          ...real,
          mode: 'PERMANENT_PLAN',
          eventId: 'clear-real',
          priority: 1,
          version: 2,
        },
        { governedClear: true },
      );
      expect((await storeA.read())?.mode).toBe('PERMANENT_PLAN');
      await expect(storeA.write(real)).rejects.toThrow(
        'EMERGENCY_STATE_REPLAY_OR_ROLLBACK',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects secondary content before key activation and after signed bytes change', () => {
    const keys = generateKeyPairSync('ed25519');
    const bytes = Buffer.from('approved secondary');
    const payload = {
      contentId: 'secondary-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      version: 1,
      approved: true,
      validFrom: new Date(clock.getTime() - 1_000).toISOString(),
      validUntil: new Date(clock.getTime() + 60_000).toISOString(),
      revoked: false,
      mediaSha256: sha256(bytes),
      keyId: 'secondary-key',
    };
    const content: SignedSecondaryContent = {
      ...payload,
      signature: sign(
        null,
        Buffer.from(canonicalize(payload)),
        keys.privateKey,
      ).toString('base64'),
    };
    const publicKeyPem = keys.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    expect(() =>
      authenticateSecondaryContent(
        content,
        bytes,
        { organizationId: 'org-a', buildingId: 'building-a' },
        [
          {
            keyId: 'secondary-key',
            publicKeyPem,
            activeFrom: new Date(clock.getTime() + 1).toISOString(),
          },
        ],
        clock,
      ),
    ).toThrow('SECONDARY_CONTENT_KEY_INVALID');
    expect(() =>
      authenticateSecondaryContent(
        content,
        Buffer.from('modified'),
        { organizationId: 'org-a', buildingId: 'building-a' },
        [
          {
            keyId: 'secondary-key',
            publicKeyPem,
            activeFrom: new Date(clock.getTime() - 1).toISOString(),
          },
        ],
        clock,
      ),
    ).toThrow('SECONDARY_CONTENT_INTEGRITY');
  });

  it('rejects value-form unsafe Chromium flags, public binds and remote origins', () => {
    expect(() =>
      validateKioskArguments(['--kiosk', '--remote-debugging-port=9222']),
    ).toThrow('UNSAFE_KIOSK_FLAG');
    expect(() =>
      validateKioskLaunchConfiguration({
        args: ['--kiosk'],
        applicationUrl: 'https://attacker.invalid/player',
        localBindAddress: '0.0.0.0',
        devToolsEnabled: false,
        downloadsEnabled: false,
      }),
    ).toThrow('KIOSK_ORIGIN_FORBIDDEN');
    expect(() =>
      validateKioskLaunchConfiguration({
        args: ['--kiosk'],
        applicationUrl: 'https://localhost/player',
        localBindAddress: '0.0.0.0',
        devToolsEnabled: false,
        downloadsEnabled: false,
      }),
    ).toThrow('KIOSK_PUBLIC_BIND_FORBIDDEN');
  });
});
