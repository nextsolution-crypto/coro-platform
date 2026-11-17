export const OPERATIONAL_SHIFTS_FEATURE_FLAG = 'OPERATIONAL_SHIFTS_ENABLED';

export function operationalShiftsEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[OPERATIONAL_SHIFTS_FEATURE_FLAG] === 'true';
}
