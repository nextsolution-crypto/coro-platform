import { createHash } from 'node:crypto';

export type PlanningRequestOperation =
  | 'CREATE_UNPLANNED_ACTIVITY'
  | 'PLAN_EXISTING_ACTIVITY'
  | 'CREATE_AND_PLAN_ACTIVITY';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
}

export function planningRequestFingerprint(
  operation: PlanningRequestOperation,
  payload: Record<string, unknown>,
) {
  return createHash('sha256')
    .update(JSON.stringify(canonical({ operation, payload })))
    .digest('hex');
}

export function planningRequestLockKey(input: {
  organizationId: string;
  userId: string;
  operation: PlanningRequestOperation;
  requestId: string;
}) {
  return `${input.organizationId}:${input.userId}:${input.operation}:${input.requestId}`;
}
