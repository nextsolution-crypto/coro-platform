import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
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
  expiresAt: string;
  usedAt?: string;
}

export interface EnrollmentProof {
  invitationId: string;
  token: string;
  deviceId: string;
  publicKeyPem: string;
  keyId: string;
  signature: string;
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
    ttlMs = 10 * 60_000,
  ): { invitationId: string; token: string; expiresAt: string } {
    const device = this.requireDevice(deviceId);
    if (device.status === 'REVOKED' || device.status === 'RETIRED')
      throw new Error('DEVICE_NOT_ENROLLABLE');
    const invitationId = randomBytes(16).toString('hex');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    this.invitations.set(invitationId, {
      invitationId,
      tokenDigest: digestSecret(token),
      deviceId,
      expiresAt,
    });
    device.status = 'PENDING_ENROLLMENT';
    return { invitationId, token, expiresAt };
  }

  enroll(proof: EnrollmentProof, now: Date): DisplayDeviceRecord {
    const invitation = this.invitations.get(proof.invitationId);
    if (!invitation || invitation.usedAt)
      throw new Error('INVITATION_INVALID_OR_USED');
    if (Date.parse(invitation.expiresAt) <= now.getTime())
      throw new Error('INVITATION_EXPIRED');
    if (
      invitation.deviceId !== proof.deviceId ||
      digestSecret(proof.token) !== invitation.tokenDigest
    ) {
      throw new Error('INVITATION_SCOPE_MISMATCH');
    }
    const valid = verify(
      null,
      enrollmentStatement(proof),
      createPublicKey(proof.publicKeyPem),
      Buffer.from(proof.signature, 'base64'),
    );
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
        expiresAt: string;
        usedAt?: string;
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
    if (
      !verify(
        null,
        statement,
        createPublicKey(record.publicKeyPem),
        Buffer.from(proof.signature, 'base64'),
      )
    ) {
      throw new Error('DEVICE_REQUEST_SIGNATURE_INVALID');
    }
    this.usedNonces.set(nonceKey, now.getTime() + 5 * 60_000);
  }

  private prune(nowMs: number): void {
    for (const [key, expires] of this.usedNonces)
      if (expires <= nowMs) this.usedNonces.delete(key);
  }
}

export const deviceEnrollmentStatement = enrollmentStatement;
