export const INCIDENT_REPORTS_FEATURE_FLAG = 'INCIDENT_REPORTS_ENABLED';

/** Foundation gate: every future controller and worker must call this guard. */
export function incidentReportsEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[INCIDENT_REPORTS_FEATURE_FLAG] === 'true';
}
