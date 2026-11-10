import { CachedPlan, PlayerDegradationReason } from './player-contracts';
import { sha256 } from './manifest-validator';

export interface OfflineDecision {
  displayPlan: boolean;
  reason: PlayerDegradationReason;
  freshnessConfirmed: boolean;
}

export function decideOfflineDisplay(
  plan: CachedPlan | null,
  now: Date,
): OfflineDecision {
  if (!plan)
    return {
      displayPlan: false,
      reason: 'PLAN_ABSENT',
      freshnessConfirmed: false,
    };
  if (plan.manifest.payload.knownRevoked) {
    return {
      displayPlan: false,
      reason: 'KNOWN_REVOKED',
      freshnessConfirmed: false,
    };
  }
  if (sha256(plan.bytes) !== plan.manifest.payload.documentSha256) {
    return {
      displayPlan: false,
      reason: 'PLAN_CORRUPT',
      freshnessConfirmed: false,
    };
  }
  const fresh = now.getTime() <= Date.parse(plan.manifest.payload.reevaluateAt);
  return {
    displayPlan: true,
    reason: fresh ? 'NETWORK_UNAVAILABLE' : 'FRESHNESS_UNCONFIRMED',
    freshnessConfirmed: fresh,
  };
}
