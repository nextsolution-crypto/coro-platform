import {
  PlayerContentKind,
  PlayerMode,
  SecondaryContent,
} from './player-contracts';

const PRIORITY: Record<PlayerMode, number> = {
  NORMAL_CYCLE: 0,
  PERMANENT_PLAN: 1,
  EMERGENCY_EXERCISE: 2,
  EMERGENCY_REAL: 3,
};

export interface ScheduleInput {
  elapsedMs: number;
  mode: PlayerMode;
  planDurationSeconds?: number;
  communicationDurationSeconds?: number;
  safetyDurationSeconds?: number;
  communication?: SecondaryContent;
  safety?: SecondaryContent;
  now: Date;
  organizationId: string;
  buildingId: string;
}

export function isSecondaryContentEligible(
  content: SecondaryContent | undefined,
  input: Pick<ScheduleInput, 'now' | 'organizationId' | 'buildingId'>,
): boolean {
  return Boolean(
    content?.approved &&
    content.authenticated &&
    !content.revoked &&
    content.organizationId === input.organizationId &&
    content.buildingId === input.buildingId &&
    Date.parse(content.validFrom) <= input.now.getTime() &&
    Date.parse(content.validUntil) > input.now.getTime(),
  );
}

export function scheduledContent(input: ScheduleInput): PlayerContentKind {
  if (input.mode !== 'NORMAL_CYCLE') return 'PLAN';
  const planMs = (input.planDurationSeconds ?? 40) * 1000;
  const communicationMs = (input.communicationDurationSeconds ?? 10) * 1000;
  const safetyMs = (input.safetyDurationSeconds ?? 10) * 1000;
  const cycleMs = planMs + communicationMs + safetyMs;
  const position = ((input.elapsedMs % cycleMs) + cycleMs) % cycleMs;
  if (position < planMs) return 'PLAN';
  if (position < planMs + communicationMs) {
    return isSecondaryContentEligible(input.communication, input)
      ? 'COMMUNICATION'
      : 'PLAN';
  }
  return isSecondaryContentEligible(input.safety, input) ? 'SAFETY' : 'PLAN';
}

export class GovernedModeController {
  private mode: PlayerMode = 'NORMAL_CYCLE';

  current(): PlayerMode {
    return this.mode;
  }

  raise(next: PlayerMode): void {
    if (PRIORITY[next] < PRIORITY[this.mode])
      throw new Error('LOWER_PRIORITY_REQUIRES_GOVERNED_CLEAR');
    this.mode = next;
  }

  clearTo(next: PlayerMode, governedAuthorization: boolean): void {
    if (!governedAuthorization) throw new Error('GOVERNED_CLEAR_REQUIRED');
    if (PRIORITY[next] >= PRIORITY[this.mode])
      throw new Error('CLEAR_TARGET_MUST_BE_LOWER');
    this.mode = next;
  }
}
