export type DisplayProfile =
  | 'LANDSCAPE_17X11'
  | 'WIDESCREEN_16X9'
  | 'WIDESCREEN_16X10';

export type PlayerMode =
  | 'NORMAL_CYCLE'
  | 'PERMANENT_PLAN'
  | 'EMERGENCY_EXERCISE'
  | 'EMERGENCY_REAL';

export type PlayerContentKind = 'PLAN' | 'COMMUNICATION' | 'SAFETY';

export interface PlayerDeviceIdentity {
  deviceId: string;
  organizationId: string;
  buildingId: string;
  locationId: string;
  displayProfile: DisplayProfile;
  softwareVersion: string;
}

export interface DisplayPolicy {
  planDurationSeconds: number;
  communicationDurationSeconds: number;
  safetyDurationSeconds: number;
  allowApprovedSecondaryContent: boolean;
}

export interface PlayerDisplayManifestPayload {
  schemaVersion: 1;
  manifestId: string;
  sequence: number;
  assignmentId: string;
  organizationId: string;
  buildingId: string;
  locationId: string;
  publicationId: string;
  documentVersionId: string;
  documentSha256: string;
  displayProfile: DisplayProfile;
  width: number;
  height: number;
  issuedAt: string;
  reevaluateAt: string;
  knownRevoked: boolean;
  renderReference: string;
  policy: DisplayPolicy;
}

export interface SignedPlayerDisplayManifest {
  keyId: string;
  algorithm: 'Ed25519';
  payload: PlayerDisplayManifestPayload;
  signature: string;
}

export interface TrustedManifestKey {
  keyId: string;
  publicKeyPem: string;
  activeFrom: string;
  revokedAt?: string;
}

export interface CachedPlan {
  manifest: SignedPlayerDisplayManifest;
  bytes: Uint8Array;
  cachedAt: string;
}

export type PlayerDegradationReason =
  | 'NONE'
  | 'NETWORK_UNAVAILABLE'
  | 'FRESHNESS_UNCONFIRMED'
  | 'PLAN_ABSENT'
  | 'PLAN_CORRUPT'
  | 'ASSIGNMENT_UNKNOWN'
  | 'KNOWN_REVOKED'
  | 'CACHE_UNAVAILABLE'
  | 'STORAGE_FULL'
  | 'CLOCK_INVALID';

export interface SecondaryContent {
  id: string;
  kind: Exclude<PlayerContentKind, 'PLAN'>;
  organizationId: string;
  buildingId: string;
  version: number;
  approved: boolean;
  revoked: boolean;
  validFrom: string;
  validUntil: string;
}

export type PlayerJournalEventType =
  | 'START'
  | 'STOP'
  | 'MODE_CHANGED'
  | 'PLAN_CHANGED'
  | 'SYNC'
  | 'NETWORK_LOST'
  | 'NETWORK_RESTORED'
  | 'INTEGRITY_ERROR'
  | 'REVOCATION'
  | 'DEGRADED'
  | 'RESTART';

export interface PlayerJournalEvent {
  sequence: number;
  occurredAt: string;
  type: PlayerJournalEventType;
  detailCode?: string;
}
