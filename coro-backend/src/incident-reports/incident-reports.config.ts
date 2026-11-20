export const INCIDENT_REPORTS_FEATURE_FLAG = 'INCIDENT_REPORTS_ENABLED';
export const INCIDENT_REPORT_IMPORT_FEATURE_FLAG =
  'INCIDENT_REPORT_IMPORT_ENABLED';
export const INCIDENT_REPORT_ATTACHMENTS_FEATURE_FLAG =
  'INCIDENT_REPORT_ATTACHMENTS_ENABLED';
export const INCIDENT_REPORT_ARCHIVES_FEATURE_FLAG =
  'INCIDENT_REPORT_ARCHIVES_ENABLED';

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

export function incidentReportAttachmentsEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    incidentReportsEnabled(environment) &&
    environment[INCIDENT_REPORT_ATTACHMENTS_FEATURE_FLAG] === 'true'
  );
}

export function incidentReportArchivesEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    incidentReportsEnabled(environment) &&
    environment[INCIDENT_REPORT_ARCHIVES_FEATURE_FLAG] === 'true'
  );
}

export function incidentReportUntrustedFilesEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    incidentReportAttachmentsEnabled(environment) ||
    incidentReportImportEnabled(environment)
  );
}
