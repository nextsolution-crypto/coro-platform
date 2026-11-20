import {
  INCIDENT_REPORTS_FEATURE_FLAG,
  incidentReportAttachmentsEnabled,
  incidentReportArchivesEnabled,
  incidentReportUntrustedFilesEnabled,
  incidentReportsEnabled,
} from './incident-reports.config';

describe('incident report feature gate', () => {
  it('is disabled by default and for non-exact values', () => {
    expect(incidentReportsEnabled({})).toBe(false);
    expect(
      incidentReportsEnabled({ [INCIDENT_REPORTS_FEATURE_FLAG]: 'TRUE' }),
    ).toBe(false);
    expect(
      incidentReportsEnabled({ [INCIDENT_REPORTS_FEATURE_FLAG]: 'false' }),
    ).toBe(false);
  });

  it('requires an explicit server-side true', () => {
    expect(
      incidentReportsEnabled({ [INCIDENT_REPORTS_FEATURE_FLAG]: 'true' }),
    ).toBe(true);
  });

  it('keeps untrusted file capabilities disabled unless independently enabled', () => {
    const reportsOnly = { INCIDENT_REPORTS_ENABLED: 'true' };
    expect(incidentReportAttachmentsEnabled(reportsOnly)).toBe(false);
    expect(incidentReportUntrustedFilesEnabled(reportsOnly)).toBe(false);
    expect(incidentReportArchivesEnabled(reportsOnly)).toBe(false);
    expect(
      incidentReportAttachmentsEnabled({
        ...reportsOnly,
        INCIDENT_REPORT_ATTACHMENTS_ENABLED: 'true',
      }),
    ).toBe(true);
    expect(
      incidentReportArchivesEnabled({
        ...reportsOnly,
        INCIDENT_REPORT_ARCHIVES_ENABLED: 'true',
      }),
    ).toBe(true);
    expect(
      incidentReportUntrustedFilesEnabled({
        ...reportsOnly,
        INCIDENT_REPORT_IMPORT_ENABLED: 'true',
      }),
    ).toBe(true);
  });
});
