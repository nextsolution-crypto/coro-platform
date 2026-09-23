export const INTRINSIC_ACTIVITY_AUDIT_ACTIONS = ['PLANNING_ACTIVITY_CREATED'] as const;

export function isOperationalActivityAudit(action: string): boolean {
  return !INTRINSIC_ACTIVITY_AUDIT_ACTIONS.includes(
    action as (typeof INTRINSIC_ACTIVITY_AUDIT_ACTIONS)[number],
  );
}
