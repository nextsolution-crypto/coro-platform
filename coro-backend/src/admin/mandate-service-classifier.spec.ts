import { classifyHistoricalActivities, HistoricalActivity } from './mandate-service-classifier';

const activity = (overrides: Partial<HistoricalActivity> = {}): HistoricalActivity => ({
  id: 'activity-a', organizationId: 'org-a', projectId: 'project-a', projectOrganizationId: 'org-a',
  projectName: 'Mandat A', projectReference: null, projectMandateId: 'mandate-a',
  activityTypeId: 'type-a', activityTypeName: 'Inspection', activityTypeOrganizationId: 'org-a',
  activityTypeExists: true, sourceMandate: true, status: 'a_faire', scheduledDate: null,
  createdAt: new Date('2026-01-01T00:00:00Z'), isRecurring: false, mandateServiceId: null,
  linkedServiceConsistent: true, bookingCount: 0, taskListCount: 0, taskCount: 0,
  timeEntryCount: 0, timeHours: 0, hasExerciseReport: false, existingServices: [], ...overrides,
});

describe('historical mandate service classifier', () => {
  it('classifies exactly one active canonical Activity as SAFE_AUTO', () => {
    expect(classifyHistoricalActivities([activity()])[0]).toMatchObject({
      classification: 'SAFE_AUTO', reasonCodes: ['SAFE_SINGLE_ACTIVE'],
      suggestedRecurrence: null, suggestedQuantity: null, snapshotSource: 'CURRENT_ACTIVITY_TYPE',
    });
  });

  it('keeps a single cancelled Activity ambiguous', () => {
    expect(classifyHistoricalActivities([activity({ status: 'annule' })])[0]).toMatchObject({
      classification: 'AMBIGUOUS', reasonCodes: ['SINGLE_CANCELLED'],
    });
  });

  it('classifies multiple active and active plus cancelled groups as ambiguous', () => {
    const active = activity();
    const second = activity({ id: 'activity-b', status: 'termine' });
    expect(classifyHistoricalActivities([active, second])[0].reasonCodes).toEqual(['MULTIPLE_ACTIVITIES']);
    const mixed = classifyHistoricalActivities([active, activity({ id: 'activity-c', status: 'annule' })])[0];
    expect(mixed).toMatchObject({ classification: 'AMBIGUOUS' });
    expect(mixed.reasonCodes).toEqual(['MULTIPLE_ACTIVITIES', 'ACTIVE_AND_CANCELLED']);
  });

  it('keeps legacy null types and non-Mandate sources out of action', () => {
    expect(classifyHistoricalActivities([activity({ activityTypeId: null, activityTypeExists: false,
      activityTypeName: null })])[0]).toMatchObject({ classification: 'NO_ACTION', reasonCodes: ['LEGACY_TYPE_MISSING'] });
    expect(classifyHistoricalActivities([activity({ sourceMandate: false })])[0]).toMatchObject({
      classification: 'NO_ACTION', reasonCodes: ['NOT_MANDATE_SOURCE'],
    });
  });

  it('reports missing Mandate, missing type, and tenant mismatches as integrity errors', () => {
    expect(classifyHistoricalActivities([activity({ projectMandateId: null })])[0].reasonCodes).toContain('MANDATE_MISSING');
    expect(classifyHistoricalActivities([activity({ activityTypeExists: false })])[0].reasonCodes).toContain('ACTIVITY_TYPE_MISSING');
    expect(classifyHistoricalActivities([activity({ activityTypeOrganizationId: 'org-b' })])[0].reasonCodes).toContain('TENANT_MISMATCH');
  });

  it('distinguishes a fully linked existing service from an incomplete link', () => {
    const existingServices = [{ id: 'service-a', activityTypeId: 'type-a', commercialStatus: 'ACTIVE' }];
    expect(classifyHistoricalActivities([activity({ existingServices, mandateServiceId: 'service-a' })])[0]).toMatchObject({
      classification: 'NO_ACTION', reasonCodes: ['SERVICE_ALREADY_EXISTS'],
    });
    expect(classifyHistoricalActivities([activity({ existingServices })])[0]).toMatchObject({
      classification: 'AMBIGUOUS', reasonCodes: ['SERVICE_ALREADY_EXISTS', 'SERVICE_LINK_INCONSISTENT'],
    });
  });

  it('does not infer recurrence or quantity from completion, recurring flags, bookings, tasks or time', () => {
    const result = classifyHistoricalActivities([activity({ status: 'termine', isRecurring: true,
      bookingCount: 2, taskListCount: 1, taskCount: 3, timeEntryCount: 4, timeHours: 7.5,
      hasExerciseReport: true })])[0];
    expect(result).toMatchObject({ classification: 'SAFE_AUTO', suggestedRecurrence: null,
      suggestedQuantity: null, isRecurringIndicators: 1, bookingCount: 2, taskCount: 3,
      timeEntryCount: 4, timeHours: 7.5, exerciseReportCount: 1 });
  });
});
