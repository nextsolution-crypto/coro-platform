export const INCIDENT_REPORTS_FEATURE_FLAG = 'INCIDENT_REPORTS_ENABLED';
export const INCIDENT_REPORT_IMPORT_FEATURE_FLAG =
  'INCIDENT_REPORT_IMPORT_ENABLED';

/** Foundation gate: every future controller and worker must call this guard. */
export function incidentReportsEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[INCIDENT_REPORTS_FEATURE_FLAG] === 'true';
}

export function incidentReportImportEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    incidentReportsEnabled(environment) &&
    environment[INCIDENT_REPORT_IMPORT_FEATURE_FLAG] === 'true'
  );
}
