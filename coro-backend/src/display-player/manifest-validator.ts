import { createHash, createPublicKey, verify } from 'node:crypto';
import {
  PlayerDeviceIdentity,
  SignedPlayerDisplayManifest,
  TrustedManifestKey,
} from './player-contracts';

export class ManifestValidationError extends Error {}

export function canonicalize(value: unknown): string {
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    throw new ManifestValidationError('NON_CANONICAL_VALUE');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new ManifestValidationError('NON_CANONICAL_VALUE');
  }
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
  expectedAssignmentId?: string;
  expectedDocument?: Uint8Array;
  maximumClockSkewMs?: number;
}

const ENVELOPE_KEYS = ['algorithm', 'keyId', 'payload', 'signature'];
const PAYLOAD_KEYS = [
  'assignmentId',
  'buildingId',
  'displayProfile',
  'documentSha256',
  'documentVersionId',
  'height',
  'issuedAt',
  'knownRevoked',
  'locationId',
  'manifestId',
  'organizationId',
  'policy',
  'publicationId',
  'reevaluateAt',
  'renderReference',
  'schemaVersion',
  'sequence',
  'width',
];
const POLICY_KEYS = [
  'allowApprovedSecondaryContent',
  'communicationDurationSeconds',
  'planDurationSeconds',
  'safetyDurationSeconds',
];

function hasExactKeys(value: object, keys: string[]): boolean {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...keys].sort())
  );
}

function validIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(value)
  );
}

function validDimensions(
  profile: string,
  width: number,
  height: number,
): boolean {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  )
    return false;
  const expected =
    profile === 'LANDSCAPE_17X11'
      ? 17 / 11
      : profile === 'WIDESCREEN_16X9'
        ? 16 / 9
        : profile === 'WIDESCREEN_16X10'
          ? 16 / 10
          : 0;
  return expected > 0 && Math.abs(width / height - expected) <= 0.02;
}

export function validateManifest(
  manifest: SignedPlayerDisplayManifest,
  context: ManifestValidationContext,
): void {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !hasExactKeys(manifest, ENVELOPE_KEYS)
  ) {
    throw new ManifestValidationError('INVALID_ENVELOPE');
  }
  const payload = manifest.payload;
  if (manifest.algorithm !== 'Ed25519') {
    throw new ManifestValidationError('UNSUPPORTED_SIGNATURE_ALGORITHM');
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    !hasExactKeys(payload, PAYLOAD_KEYS)
  ) {
    throw new ManifestValidationError('INVALID_SCHEMA');
  }
  if (
    payload.schemaVersion !== 1 ||
    !Number.isSafeInteger(payload.sequence) ||
    payload.sequence < 1 ||
    !payload.policy ||
    typeof payload.policy !== 'object' ||
    !hasExactKeys(payload.policy, POLICY_KEYS)
  ) {
    throw new ManifestValidationError('INVALID_SCHEMA');
  }
  const identifiers = [
    payload.manifestId,
    payload.assignmentId,
    payload.organizationId,
    payload.buildingId,
    payload.locationId,
    payload.publicationId,
    payload.documentVersionId,
  ];
  if (!identifiers.every(validIdentifier))
    throw new ManifestValidationError('INVALID_IDENTIFIER');
  if (
    context.expectedAssignmentId &&
    payload.assignmentId !== context.expectedAssignmentId
  ) {
    throw new ManifestValidationError('ASSIGNMENT_SUBSTITUTION');
  }
  if (!validDimensions(payload.displayProfile, payload.width, payload.height)) {
    throw new ManifestValidationError('INVALID_DISPLAY_GEOMETRY');
  }
  if (
    payload.policy.planDurationSeconds !== 40 ||
    payload.policy.communicationDurationSeconds !== 10 ||
    payload.policy.safetyDurationSeconds !== 10 ||
    typeof payload.policy.allowApprovedSecondaryContent !== 'boolean' ||
    !payload.renderReference.startsWith('private://')
  ) {
    throw new ManifestValidationError('INVALID_DISPLAY_POLICY');
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
  if (trustedKey.expiresAt && issuedAt >= Date.parse(trustedKey.expiresAt)) {
    throw new ManifestValidationError('EXPIRED_SIGNING_KEY');
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
