import {
  createHash,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
} from 'node:crypto';
import { DisplayProfile } from '../display-player/player-contracts';

export type DeviceStatus =
  | 'REGISTERED'
  | 'PENDING_ENROLLMENT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'RETIRED';

export interface DisplayDeviceRecord {
  deviceId: string;
  organizationId: string;
  buildingId: string;
  locationId: string;
  displayProfile: DisplayProfile;
  displayName: string;
  status: DeviceStatus;
  publicKeyPem?: string;
  keyId?: string;
  softwareVersion?: string;
  lastVerifiedSyncAt?: string;
  lastAcceptedManifestSequence: number;
  lastDisplayedVersionId?: string;
  createdAt: string;
  revokedAt?: string;
}

interface EnrollmentInvitation {
  invitationId: string;
  tokenDigest: string;
  deviceId: string;
  expectedKeyId: string;
  expectedPublicKeyDigest: string;
  expiresAt: string;
  usedAt?: string;
  invalidatedAt?: string;
}

export interface EnrollmentProof {
  invitationId: string;
  token: string;
  deviceId: string;
  publicKeyPem: string;
  keyId: string;
  signature: string;
}

export interface ExpectedDeviceKey {
  keyId: string;
  publicKeyPem: string;
}

export function digestSecret(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function enrollmentStatement(
  proof: Pick<EnrollmentProof, 'invitationId' | 'deviceId' | 'keyId'>,
): Buffer {
  return Buffer.from(
    `CORO-DISPLAY-ENROLLMENT\n${proof.invitationId}\n${proof.deviceId}\n${proof.keyId}`,
  );
}

export class DeviceRegistry {
  private readonly devices = new Map<string, DisplayDeviceRecord>();
  private readonly invitations = new Map<string, EnrollmentInvitation>();

  register(
    record: Omit<
      DisplayDeviceRecord,
      'status' | 'lastAcceptedManifestSequence' | 'createdAt'
    >,
    now: Date,
  ): DisplayDeviceRecord {
    if (this.devices.has(record.deviceId))
      throw new Error('DEVICE_ALREADY_EXISTS');
    const created: DisplayDeviceRecord = {
      ...record,
      status: 'REGISTERED',
      lastAcceptedManifestSequence: 0,
      createdAt: now.toISOString(),
    };
    this.devices.set(created.deviceId, created);
    return { ...created };
  }

  createInvitation(
    deviceId: string,
    now: Date,
    expectedKey: ExpectedDeviceKey,
    ttlMs = 10 * 60_000,
  ): { invitationId: string; token: string; expiresAt: string } {
    const device = this.requireDevice(deviceId);
    if (
      device.status !== 'REGISTERED' &&
      device.status !== 'PENDING_ENROLLMENT'
    )
      throw new Error('DEVICE_NOT_ENROLLABLE');
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 15 * 60_000)
      throw new Error('INVITATION_TTL_INVALID');
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(expectedKey.keyId))
      throw new Error('EXPECTED_DEVICE_KEY_INVALID');
    try {
      if (
        createPublicKey(expectedKey.publicKeyPem).asymmetricKeyType !==
        'ed25519'
      )
        throw new Error('EXPECTED_DEVICE_KEY_INVALID');
    } catch {
      throw new Error('EXPECTED_DEVICE_KEY_INVALID');
    }
    const invitationId = randomBytes(16).toString('hex');
    const token = randomBytes(32).toString('base64url');
    for (const invitation of this.invitations.values()) {
      if (
        invitation.deviceId === deviceId &&
        !invitation.usedAt &&
        !invitation.invalidatedAt
      )
        invitation.invalidatedAt = now.toISOString();
    }
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    this.invitations.set(invitationId, {
      invitationId,
      tokenDigest: digestSecret(token),
      deviceId,
      expectedKeyId: expectedKey.keyId,
      expectedPublicKeyDigest: digestSecret(expectedKey.publicKeyPem),
      expiresAt,
    });
    device.status = 'PENDING_ENROLLMENT';
    return { invitationId, token, expiresAt };
  }

  enroll(proof: EnrollmentProof, now: Date): DisplayDeviceRecord {
    const invitation = this.invitations.get(proof.invitationId);
    if (!invitation || invitation.usedAt || invitation.invalidatedAt)
      throw new Error('INVITATION_INVALID_OR_USED');
    if (Date.parse(invitation.expiresAt) <= now.getTime())
      throw new Error('INVITATION_EXPIRED');
    if (
      invitation.deviceId !== proof.deviceId ||
      invitation.expectedKeyId !== proof.keyId ||
      invitation.expectedPublicKeyDigest !== digestSecret(proof.publicKeyPem) ||
      !timingSafeEqual(
        Buffer.from(digestSecret(proof.token), 'hex'),
        Buffer.from(invitation.tokenDigest, 'hex'),
      )
    ) {
      throw new Error('INVITATION_SCOPE_MISMATCH');
    }
    if (
      !/^[A-Za-z0-9._:-]{1,128}$/.test(proof.keyId) ||
      proof.signature.length > 512
    )
      throw new Error('DEVICE_PROOF_INVALID');
    let valid = false;
    try {
      const publicKey = createPublicKey(proof.publicKeyPem);
      if (publicKey.asymmetricKeyType !== 'ed25519')
        throw new Error('DEVICE_PROOF_INVALID');
      valid = verify(
        null,
        enrollmentStatement(proof),
        publicKey,
        Buffer.from(proof.signature, 'base64'),
      );
    } catch {
      throw new Error('DEVICE_PROOF_INVALID');
    }
    if (!valid) throw new Error('DEVICE_PROOF_INVALID');
    const device = this.requireDevice(proof.deviceId);
    if (device.status !== 'PENDING_ENROLLMENT')
      throw new Error('DEVICE_NOT_PENDING');
    invitation.usedAt = now.toISOString();
    device.publicKeyPem = proof.publicKeyPem;
    device.keyId = proof.keyId;
    device.status = 'ACTIVE';
    return { ...device };
  }

  revoke(deviceId: string, now: Date): void {
    const device = this.requireDevice(deviceId);
    device.status = 'REVOKED';
    device.revokedAt = now.toISOString();
  }

  get(deviceId: string): DisplayDeviceRecord | undefined {
    const value = this.devices.get(deviceId);
    return value ? { ...value } : undefined;
  }

  invitationAudit(invitationId: string):
    | {
        invitationId: string;
        tokenDigest: string;
        deviceId: string;
        expectedKeyId: string;
        expectedPublicKeyDigest: string;
        expiresAt: string;
        usedAt?: string;
        invalidatedAt?: string;
      }
    | undefined {
    const value = this.invitations.get(invitationId);
    return value ? { ...value } : undefined;
  }

  private requireDevice(deviceId: string): DisplayDeviceRecord {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('DEVICE_NOT_FOUND');
    return device;
  }
}

export interface DeviceRequestProof {
  deviceId: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  bodySha256: string;
  signature: string;
}

export class DeviceAuthenticator {
  private readonly usedNonces = new Map<string, number>();

  constructor(restoredNonces: ReadonlyArray<[string, number]> = []) {
    for (const [key, expiresAt] of restoredNonces) {
      if (typeof key === 'string' && Number.isFinite(expiresAt))
        this.usedNonces.set(key, expiresAt);
    }
  }

  authenticate(
    record: DisplayDeviceRecord,
    proof: DeviceRequestProof,
    now: Date,
  ): void {
    if (
      record.status !== 'ACTIVE' ||
      !record.publicKeyPem ||
      record.deviceId !== proof.deviceId
    )
      throw new Error('DEVICE_NOT_ACTIVE');
    const timestamp = Date.parse(proof.timestamp);
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(now.getTime() - timestamp) > 2 * 60_000
    )
      throw new Error('DEVICE_REQUEST_STALE');
    if (
      !/^[A-Za-z0-9_-]{16,128}$/.test(proof.nonce) ||
      !/^[A-Fa-f0-9]{64}$/.test(proof.bodySha256) ||
      !/^[A-Z]+$/.test(proof.method.toUpperCase()) ||
      proof.method.length > 16 ||
      !proof.path.startsWith('/') ||
      proof.path.includes('\n') ||
      proof.path.length > 2_048
    )
      throw new Error('DEVICE_REQUEST_INVALID');
    const nonceKey = `${record.deviceId}:${proof.nonce}`;
    this.prune(now.getTime());
    if (this.usedNonces.has(nonceKey)) throw new Error('DEVICE_REQUEST_REPLAY');
    const statement = Buffer.from(
      [
        'CORO-DISPLAY-REQUEST',
        proof.deviceId,
        proof.timestamp,
        proof.nonce,
        proof.method.toUpperCase(),
        proof.path,
        proof.bodySha256,
      ].join('\n'),
    );
    let valid = false;
    try {
      const publicKey = createPublicKey(record.publicKeyPem);
      if (publicKey.asymmetricKeyType !== 'ed25519')
        throw new Error('DEVICE_REQUEST_SIGNATURE_INVALID');
      valid = verify(
        null,
        statement,
        publicKey,
        Buffer.from(proof.signature, 'base64'),
      );
    } catch {
      throw new Error('DEVICE_REQUEST_SIGNATURE_INVALID');
    }
    if (!valid) {
      throw new Error('DEVICE_REQUEST_SIGNATURE_INVALID');
    }
    this.usedNonces.set(nonceKey, now.getTime() + 5 * 60_000);
  }

  snapshot(now: Date): Array<[string, number]> {
    this.prune(now.getTime());
    return [...this.usedNonces.entries()];
  }

  private prune(nowMs: number): void {
    for (const [key, expires] of this.usedNonces)
      if (expires <= nowMs) this.usedNonces.delete(key);
  }
}

export const deviceEnrollmentStatement = enrollmentStatement;
