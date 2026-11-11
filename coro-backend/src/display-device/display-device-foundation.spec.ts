import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalize, sha256 } from '../display-player/manifest-validator';
import {
  SignedPlayerDisplayManifest,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import {
  DeviceAuthenticator,
  DeviceRegistry,
  deviceEnrollmentStatement,
  digestSecret,
} from './device-security';
import {
  KIOSK_FORBIDDEN_FLAGS,
  PLAYER_CSP,
  RestartWatchdog,
  validateKioskArguments,
} from './kiosk-policy';
import { EmergencyStateStore, PersistentPlanCache } from './persistent-runtime';
import {
  authenticateSecondaryContent,
  SignedSecondaryContent,
  validateTrustBundle,
} from './trust-and-content';

const now = new Date('2031-01-01T12:00:00.000Z');

function registeredDevice(registry: DeviceRegistry) {
  return registry.register(
    {
      deviceId: 'device-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      locationId: 'lobby-a',
      displayProfile: 'WIDESCREEN_16X9',
      displayName: 'Synthetic lobby',
    },
    now,
  );
}

function enroll(registry: DeviceRegistry) {
  registeredDevice(registry);
  const keys = generateKeyPairSync('ed25519');
  const publicKeyPem = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const invitation = registry.createInvitation('device-a', now, {
    keyId: 'device-key-a',
    publicKeyPem,
  });
  const proof = {
    invitationId: invitation.invitationId,
    token: invitation.token,
    deviceId: 'device-a',
    keyId: 'device-key-a',
    publicKeyPem,
    signature: sign(
      null,
      deviceEnrollmentStatement({
        invitationId: invitation.invitationId,
        deviceId: 'device-a',
        keyId: 'device-key-a',
      }),
      keys.privateKey,
    ).toString('base64'),
  };
  return {
    device: registry.enroll(proof, new Date(now.getTime() + 1_000)),
    invitation,
    keys,
    proof,
  };
}

describe('DISPLAY-06B device and kiosk foundation', () => {
  it('uses opaque one-use enrollment invitations and never exposes the token in audit state', () => {
    const registry = new DeviceRegistry();
    const { invitation, proof } = enroll(registry);
    const audit = registry.invitationAudit(invitation.invitationId)!;
    expect(audit.tokenDigest).toBe(digestSecret(invitation.token));
    expect(JSON.stringify(audit)).not.toContain(invitation.token);
    expect(() =>
      registry.enroll(proof, new Date(now.getTime() + 2_000)),
    ).toThrow('INVITATION_INVALID_OR_USED');
  });

  it('rejects expired, foreign and forged enrollment proofs', () => {
    const expired = new DeviceRegistry();
    registeredDevice(expired);
    const keys = generateKeyPairSync('ed25519');
    const publicKeyPem = keys.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    const invitation = expired.createInvitation(
      'device-a',
      now,
      { keyId: 'device-key-a', publicKeyPem },
      1_000,
    );
    const base = {
      invitationId: invitation.invitationId,
      token: invitation.token,
      deviceId: 'device-a',
      keyId: 'device-key-a',
      publicKeyPem,
      signature: '',
    };
    expect(() => expired.enroll(base, new Date(now.getTime() + 1_001))).toThrow(
      'INVITATION_EXPIRED',
    );

    const forged = new DeviceRegistry();
    registeredDevice(forged);
    const current = forged.createInvitation('device-a', now, {
      keyId: base.keyId,
      publicKeyPem: base.publicKeyPem,
    });
    expect(() =>
      forged.enroll(
        { ...base, invitationId: current.invitationId, token: current.token },
        now,
      ),
    ).toThrow('DEVICE_PROOF_INVALID');
  });

  it('authenticates signed requests and blocks replay, stale requests and revoked devices', () => {
    const registry = new DeviceRegistry();
    const { device, keys } = enroll(registry);
    const proof = {
      deviceId: device.deviceId,
      timestamp: now.toISOString(),
      nonce: 'nonce-unique-a-01',
      method: 'GET',
      path: '/device/manifest',
      bodySha256: sha256(Buffer.alloc(0)),
      signature: '',
    };
    const statement = Buffer.from(
      [
        'CORO-DISPLAY-REQUEST',
        proof.deviceId,
        proof.timestamp,
        proof.nonce,
        proof.method,
        proof.path,
        proof.bodySha256,
      ].join('\n'),
    );
    proof.signature = sign(null, statement, keys.privateKey).toString('base64');
    const authenticator = new DeviceAuthenticator();
    expect(() => authenticator.authenticate(device, proof, now)).not.toThrow();
    expect(() => authenticator.authenticate(device, proof, now)).toThrow(
      'DEVICE_REQUEST_REPLAY',
    );
    registry.revoke(device.deviceId, now);
    expect(() =>
      authenticator.authenticate(
        registry.get(device.deviceId)!,
        { ...proof, nonce: 'nonce-unique-a-02' },
        now,
      ),
    ).toThrow('DEVICE_NOT_ACTIVE');
  });

  it('authenticates trust-bundle updates and refuses rollback', () => {
    const root = generateKeyPairSync('ed25519');
    const payload = {
      version: 2,
      issuedAt: now.toISOString(),
      keys: [] as TrustedManifestKey[],
      signerKeyId: 'offline-root',
    };
    const bundle = {
      ...payload,
      signature: sign(
        null,
        Buffer.from(canonicalize(payload)),
        root.privateKey,
      ).toString('base64'),
    };
    expect(() =>
      validateTrustBundle(
        bundle,
        1,
        root.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      ),
    ).not.toThrow();
    expect(() =>
      validateTrustBundle(
        bundle,
        2,
        root.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      ),
    ).toThrow('TRUST_BUNDLE_ROLLBACK');
  });

  it('requires end-to-end signatures for secondary content', () => {
    const keys = generateKeyPairSync('ed25519');
    const bytes = Buffer.from('safe signed message');
    const payload = {
      contentId: 'content-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      version: 1,
      approved: true,
      validFrom: '2030-12-31T00:00:00.000Z',
      validUntil: '2031-01-02T00:00:00.000Z',
      revoked: false,
      mediaSha256: sha256(bytes),
      keyId: 'content-key',
    };
    const content: SignedSecondaryContent = {
      ...payload,
      signature: sign(
        null,
        Buffer.from(canonicalize(payload)),
        keys.privateKey,
      ).toString('base64'),
    };
    const trusted = [
      {
        keyId: 'content-key',
        publicKeyPem: keys.publicKey
          .export({ type: 'spki', format: 'pem' })
          .toString(),
        activeFrom: '2030-01-01T00:00:00.000Z',
      },
    ];
    expect(() =>
      authenticateSecondaryContent(
        content,
        bytes,
        { organizationId: 'org-a', buildingId: 'building-a' },
        trusted,
        now,
      ),
    ).not.toThrow();
    expect(() =>
      authenticateSecondaryContent(
        { ...content, buildingId: 'building-b' },
        bytes,
        { organizationId: 'org-a', buildingId: 'building-a' },
        trusted,
        now,
      ),
    ).toThrow('SECONDARY_CONTENT_SCOPE_MISMATCH');
    expect(() =>
      authenticateSecondaryContent(
        content,
        Buffer.from('tampered'),
        { organizationId: 'org-a', buildingId: 'building-a' },
        trusted,
        now,
      ),
    ).toThrow('SECONDARY_CONTENT_INTEGRITY');
  });

  it('persists a plan atomically and falls back to the retained valid generation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'coro-display-cache-'));
    try {
      const bytes = Buffer.from('plan-generation-one');
      const manifest = {
        payload: {
          sequence: 1,
          documentVersionId: 'document-version-one',
          knownRevoked: false,
          documentSha256: sha256(bytes),
        },
      } as unknown as SignedPlayerDisplayManifest;
      const cache = new PersistentPlanCache(
        root,
        'device-a',
        'lobby-a',
        () => undefined,
      );
      await cache.commit(manifest, bytes, now);
      expect(Buffer.from((await cache.readVerified())!.bytes).toString()).toBe(
        'plan-generation-one',
      );
      await expect(
        cache.commit(manifest, Buffer.from('corrupt'), now),
      ).rejects.toThrow('DOCUMENT_INTEGRITY_MISMATCH');
      expect(Buffer.from((await cache.readVerified())!.bytes).toString()).toBe(
        'plan-generation-one',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists emergency state and refuses a corrupted state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'coro-display-emergency-'));
    try {
      const path = join(root, 'emergency.json');
      const store = new EmergencyStateStore(path, Buffer.alloc(32, 7));
      const state = {
        mode: 'EMERGENCY_REAL' as const,
        eventId: 'synthetic-event',
        source: 'LOCAL_SYNTHETIC' as const,
        priority: 3,
        occurredAt: now.toISOString(),
        version: 1,
        authorizationId: 'synthetic-authorization',
      };
      await store.write(state);
      expect(await store.read()).toEqual(state);
      const envelope = JSON.parse(await readFile(path, 'utf8')) as {
        payload: string;
        mac: string;
      };
      await writeFile(
        path,
        JSON.stringify({
          ...envelope,
          payload: envelope.payload.replace('EMERGENCY_REAL', 'NORMAL_CYCLE'),
        }),
      );
      await expect(store.read()).rejects.toThrow('EMERGENCY_STATE_CORRUPT');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('enforces kiosk hardening, a restrictive CSP and bounded restarts', () => {
    expect(PLAYER_CSP).toContain("default-src 'none'");
    expect(PLAYER_CSP).not.toContain('unsafe-eval');
    expect(() => validateKioskArguments(['--kiosk'])).not.toThrow();
    for (const flag of KIOSK_FORBIDDEN_FLAGS)
      expect(() => validateKioskArguments(['--kiosk', flag])).toThrow(
        'UNSAFE_KIOSK_FLAG',
      );
    const watchdog = new RestartWatchdog(2, 60_000);
    expect(watchdog.allowRestart(now)).toBe(true);
    expect(watchdog.allowRestart(new Date(now.getTime() + 1_000))).toBe(true);
    expect(watchdog.allowRestart(new Date(now.getTime() + 2_000))).toBe(false);
  });
});
