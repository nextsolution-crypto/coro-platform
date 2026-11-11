import { createPublicKey, KeyObject, verify } from 'node:crypto';
import { canonicalize, sha256 } from '../display-player/manifest-validator';
import { TrustedManifestKey } from '../display-player/player-contracts';

export interface SignedTrustBundle {
  version: number;
  issuedAt: string;
  keys: TrustedManifestKey[];
  signerKeyId: string;
  signature: string;
}

export function validateTrustBundle(
  bundle: SignedTrustBundle,
  currentVersion: number,
  rootPublicKeyPem: string,
  options: { expectedSignerKeyId?: string; now?: Date } = {},
): void {
  if (!Number.isSafeInteger(bundle.version) || bundle.version <= currentVersion)
    throw new Error('TRUST_BUNDLE_ROLLBACK');
  const issuedAt = Date.parse(bundle.issuedAt);
  if (
    !Number.isFinite(issuedAt) ||
    (options.now && issuedAt > options.now.getTime())
  )
    throw new Error('TRUST_BUNDLE_TIME_INVALID');
  if (
    options.expectedSignerKeyId &&
    bundle.signerKeyId !== options.expectedSignerKeyId
  )
    throw new Error('TRUST_BUNDLE_SIGNER_MISMATCH');
  const payload = {
    version: bundle.version,
    issuedAt: bundle.issuedAt,
    keys: bundle.keys,
    signerKeyId: bundle.signerKeyId,
  };
  let rootKey: KeyObject;
  try {
    rootKey = createPublicKey(rootPublicKeyPem);
    if (rootKey.asymmetricKeyType !== 'ed25519')
      throw new Error('TRUST_ROOT_KEY_INVALID');
  } catch {
    throw new Error('TRUST_ROOT_KEY_INVALID');
  }
  if (
    !verify(
      null,
      Buffer.from(canonicalize(payload)),
      rootKey,
      Buffer.from(bundle.signature, 'base64'),
    )
  ) {
    throw new Error('TRUST_BUNDLE_SIGNATURE_INVALID');
  }
  const ids = new Set<string>();
  for (const key of bundle.keys) {
    if (ids.has(key.keyId)) throw new Error('TRUST_BUNDLE_DUPLICATE_KEY');
    const activeFrom = Date.parse(key.activeFrom);
    const expiresAt = key.expiresAt ? Date.parse(key.expiresAt) : undefined;
    const revokedAt = key.revokedAt ? Date.parse(key.revokedAt) : undefined;
    if (
      !key.keyId ||
      !Number.isFinite(activeFrom) ||
      (expiresAt !== undefined &&
        (!Number.isFinite(expiresAt) || expiresAt <= activeFrom)) ||
      (revokedAt !== undefined && !Number.isFinite(revokedAt))
    )
      throw new Error('TRUST_BUNDLE_KEY_INVALID');
    try {
      if (createPublicKey(key.publicKeyPem).asymmetricKeyType !== 'ed25519')
        throw new Error('TRUST_BUNDLE_KEY_INVALID');
    } catch {
      throw new Error('TRUST_BUNDLE_KEY_INVALID');
    }
    ids.add(key.keyId);
  }
}

export interface SignedSecondaryContent {
  contentId: string;
  organizationId: string;
  buildingId: string;
  version: number;
  approved: boolean;
  validFrom: string;
  validUntil: string;
  revoked: boolean;
  mediaSha256: string;
  keyId: string;
  signature: string;
}

export function authenticateSecondaryContent(
  content: SignedSecondaryContent,
  bytes: Uint8Array,
  expectedScope: { organizationId: string; buildingId: string },
  trustedKeys: TrustedManifestKey[],
  now: Date,
): void {
  const validFrom = Date.parse(content.validFrom);
  const validUntil = Date.parse(content.validUntil);
  if (
    !Number.isSafeInteger(content.version) ||
    content.version < 1 ||
    !/^[a-f0-9]{64}$/.test(content.mediaSha256) ||
    !Number.isFinite(validFrom) ||
    !Number.isFinite(validUntil) ||
    validUntil <= validFrom
  )
    throw new Error('SECONDARY_CONTENT_INVALID');
  if (!content.approved || content.revoked)
    throw new Error('SECONDARY_CONTENT_NOT_APPROVED');
  if (
    content.organizationId !== expectedScope.organizationId ||
    content.buildingId !== expectedScope.buildingId
  ) {
    throw new Error('SECONDARY_CONTENT_SCOPE_MISMATCH');
  }
  if (validFrom > now.getTime() || validUntil <= now.getTime())
    throw new Error('SECONDARY_CONTENT_EXPIRED');
  if (sha256(bytes) !== content.mediaSha256)
    throw new Error('SECONDARY_CONTENT_INTEGRITY');
  const key = trustedKeys.find(
    (candidate) => candidate.keyId === content.keyId,
  );
  const keyActiveFrom = key ? Date.parse(key.activeFrom) : Number.NaN;
  const keyRevokedAt = key?.revokedAt ? Date.parse(key.revokedAt) : undefined;
  const keyExpiresAt = key?.expiresAt ? Date.parse(key.expiresAt) : undefined;
  let contentPublicKey: KeyObject | undefined;
  try {
    contentPublicKey = key ? createPublicKey(key.publicKeyPem) : undefined;
  } catch {
    contentPublicKey = undefined;
  }
  if (
    !key ||
    !contentPublicKey ||
    contentPublicKey.asymmetricKeyType !== 'ed25519' ||
    !Number.isFinite(keyActiveFrom) ||
    keyActiveFrom > now.getTime() ||
    (keyRevokedAt !== undefined &&
      (!Number.isFinite(keyRevokedAt) || keyRevokedAt <= now.getTime())) ||
    (keyExpiresAt !== undefined &&
      (!Number.isFinite(keyExpiresAt) || keyExpiresAt <= now.getTime()))
  )
    throw new Error('SECONDARY_CONTENT_KEY_INVALID');
  const { signature, ...payload } = content;
  if (
    !verify(
      null,
      Buffer.from(canonicalize(payload)),
      contentPublicKey,
      Buffer.from(signature, 'base64'),
    )
  ) {
    throw new Error('SECONDARY_CONTENT_SIGNATURE_INVALID');
  }
}
