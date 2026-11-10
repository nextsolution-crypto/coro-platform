import { createHash, createPublicKey, verify } from 'node:crypto';
import {
  PlayerDeviceIdentity,
  SignedPlayerDisplayManifest,
  TrustedManifestKey,
} from './player-contracts';

export class ManifestValidationError extends Error {}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(',')}}`;
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export interface ManifestValidationContext {
  device: PlayerDeviceIdentity;
  trustedKeys: TrustedManifestKey[];
  now: Date;
  highestAcceptedSequence: number;
  expectedDocument?: Uint8Array;
  maximumClockSkewMs?: number;
}

export function validateManifest(
  manifest: SignedPlayerDisplayManifest,
  context: ManifestValidationContext,
): void {
  const payload = manifest.payload;
  if (manifest.algorithm !== 'Ed25519') {
    throw new ManifestValidationError('UNSUPPORTED_SIGNATURE_ALGORITHM');
  }
  if (payload.schemaVersion !== 1 || !Number.isSafeInteger(payload.sequence)) {
    throw new ManifestValidationError('INVALID_SCHEMA');
  }
  if (payload.sequence <= context.highestAcceptedSequence) {
    throw new ManifestValidationError('REPLAY_OR_ROLLBACK');
  }
  if (
    payload.organizationId !== context.device.organizationId ||
    payload.buildingId !== context.device.buildingId ||
    payload.locationId !== context.device.locationId ||
    payload.displayProfile !== context.device.displayProfile
  ) {
    throw new ManifestValidationError('DEVICE_SCOPE_MISMATCH');
  }
  if (payload.knownRevoked) {
    throw new ManifestValidationError('KNOWN_REVOKED');
  }
  if (!/^[a-f0-9]{64}$/.test(payload.documentSha256)) {
    throw new ManifestValidationError('INVALID_DOCUMENT_DIGEST');
  }
  const issuedAt = Date.parse(payload.issuedAt);
  const reevaluateAt = Date.parse(payload.reevaluateAt);
  const skew = context.maximumClockSkewMs ?? 5 * 60_000;
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(reevaluateAt) ||
    reevaluateAt <= issuedAt
  ) {
    throw new ManifestValidationError('INVALID_TIME_WINDOW');
  }
  if (issuedAt > context.now.getTime() + skew) {
    throw new ManifestValidationError('CLOCK_OR_FUTURE_MANIFEST');
  }
  const trustedKey = context.trustedKeys.find(
    (key) => key.keyId === manifest.keyId,
  );
  if (!trustedKey || Date.parse(trustedKey.activeFrom) > issuedAt) {
    throw new ManifestValidationError('UNTRUSTED_KEY');
  }
  if (trustedKey.revokedAt && issuedAt >= Date.parse(trustedKey.revokedAt)) {
    throw new ManifestValidationError('REVOKED_SIGNING_KEY');
  }
  const valid = verify(
    null,
    Buffer.from(canonicalize(payload)),
    createPublicKey(trustedKey.publicKeyPem),
    Buffer.from(manifest.signature, 'base64'),
  );
  if (!valid) throw new ManifestValidationError('INVALID_SIGNATURE');
  if (
    context.expectedDocument &&
    sha256(context.expectedDocument) !== payload.documentSha256
  ) {
    throw new ManifestValidationError('DOCUMENT_INTEGRITY_MISMATCH');
  }
}
