import {
  INCIDENT_REPORTS_FEATURE_FLAG,
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
});
