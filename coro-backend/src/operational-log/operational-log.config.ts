export const OPERATIONAL_LOG_FEATURE_FLAG = 'OPERATIONAL_LOG_ENABLED';

export function operationalLogEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[OPERATIONAL_LOG_FEATURE_FLAG] === 'true';
}
