import { createPublicKey, verify } from 'node:crypto';
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
): void {
  if (!Number.isSafeInteger(bundle.version) || bundle.version <= currentVersion)
    throw new Error('TRUST_BUNDLE_ROLLBACK');
  const payload = {
    version: bundle.version,
    issuedAt: bundle.issuedAt,
    keys: bundle.keys,
    signerKeyId: bundle.signerKeyId,
  };
  if (
    !verify(
      null,
      Buffer.from(canonicalize(payload)),
      createPublicKey(rootPublicKeyPem),
      Buffer.from(bundle.signature, 'base64'),
    )
  ) {
    throw new Error('TRUST_BUNDLE_SIGNATURE_INVALID');
  }
  const ids = new Set<string>();
  for (const key of bundle.keys) {
    if (ids.has(key.keyId)) throw new Error('TRUST_BUNDLE_DUPLICATE_KEY');
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
  if (!content.approved || content.revoked)
    throw new Error('SECONDARY_CONTENT_NOT_APPROVED');
  if (
    content.organizationId !== expectedScope.organizationId ||
    content.buildingId !== expectedScope.buildingId
  ) {
    throw new Error('SECONDARY_CONTENT_SCOPE_MISMATCH');
  }
  if (
    Date.parse(content.validFrom) > now.getTime() ||
    Date.parse(content.validUntil) <= now.getTime()
  )
    throw new Error('SECONDARY_CONTENT_EXPIRED');
  if (sha256(bytes) !== content.mediaSha256)
    throw new Error('SECONDARY_CONTENT_INTEGRITY');
  const key = trustedKeys.find(
    (candidate) => candidate.keyId === content.keyId,
  );
  if (
    !key ||
    key.revokedAt ||
    (key.expiresAt && Date.parse(key.expiresAt) <= now.getTime())
  )
    throw new Error('SECONDARY_CONTENT_KEY_INVALID');
  const { signature, ...payload } = content;
  if (
    !verify(
      null,
      Buffer.from(canonicalize(payload)),
      createPublicKey(key.publicKeyPem),
      Buffer.from(signature, 'base64'),
    )
  ) {
    throw new Error('SECONDARY_CONTENT_SIGNATURE_INVALID');
  }
}
