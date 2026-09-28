import { previewOperations, PreviewActivity, PreviewService } from './mandate-operations-preview.engine';

const service = (overrides: Partial<PreviewService> = {}): PreviewService => ({ id: 'service-a', projectId: 'project-a',
  organizationId: 'org-a', activityTypeId: 'type-a', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1,
  displayOrder: 0, activityType: { id: 'type-a', isActive: true, organizationId: 'org-a' }, ...overrides });
const activity = (overrides: Partial<PreviewActivity> = {}): PreviewActivity => ({ id: 'activity-a', projectId: 'project-a',
  organizationId: 'org-a', activityTypeId: 'type-a', label: 'Inspection', status: 'a_faire', scheduledDate: null,
  createdAt: new Date('2026-01-01'), mandateServiceId: 'service-a', bookings: [], taskCount: 0, actualHours: 0,
  exerciseReportCount: 0, ...overrides });
const operation = (services: PreviewService[], activities: PreviewActivity[] = []) => previewOperations(services, activities);

describe('Mandate service operational preview engine', () => {
  it('returns an empty and deterministically ordered preview', () => {
    expect(operation([])).toEqual([]);
    expect(operation([service({ id: 'b', displayOrder: 1 }), service({ id: 'a', displayOrder: 1 })]).map(x => x.serviceId))
      .toEqual(['a', 'b']);
  });
  it('creates only a new active ONCE quantity-one service', () => {
    expect(operation([service()])[0]).toMatchObject({ action: 'CREATE_ACTIVITY', reasonCode: 'NO_ACTIVITY_EXISTS' });
  });
  it('requires decisions for one or several legacy candidates, including cancelled history', () => {
    expect(operation([service()], [activity({ mandateServiceId: null, status: 'annule' })])[0])
      .toMatchObject({ action: 'REQUIRES_DECISION', reasonCode: 'LEGACY_ACTIVITY_CANDIDATE' });
    const premont = [0, 1, 2, 3].map(index => activity({ id: `legacy-${index}`, mandateServiceId: null,
      status: index === 3 ? 'a_faire' : 'annule', bookings: index === 3 ? [{ status: 'CONFIRMEE', assignments: [] }] : [],
      taskCount: index === 3 ? 2 : 0 }));
    expect(operation([service()], premont)[0]).toMatchObject({ action: 'REQUIRES_DECISION',
      reasonCode: 'LEGACY_MULTIPLE_CANDIDATES', hasOpenBooking: true });
  });
  it('recognizes linked active, cancelled, completed and multiple active Activities', () => {
    expect(operation([service()], [activity()])[0]).toMatchObject({ action: 'NO_ACTION', reasonCode: 'ACTIVE_ACTIVITY_EXISTS' });
    expect(operation([service()], [activity({ status: 'annule' })])[0]).toMatchObject({ action: 'REQUIRES_DECISION',
      reasonCode: 'LATEST_ACTIVITY_CANCELLED' });
    expect(operation([service()], [activity({ status: 'termine' })])[0]).toMatchObject({ action: 'NO_ACTION',
      reasonCode: 'COMPLETED_ACTIVITY_EXISTS' });
    expect(operation([service()], [activity(), activity({ id: 'activity-b' })])[0]).toMatchObject({
      action: 'REQUIRES_DECISION', reasonCode: 'MULTIPLE_ACTIVE_ACTIVITIES' });
  });
  it('does not infer quantity or annual coverage', () => {
    expect(operation([service({ quantity: 2 })])[0].reasonCode).toBe('QUANTITY_REQUIRES_SCHEDULING_POLICY');
    expect(operation([service({ recurrenceMode: 'ANNUAL' })])[0].reasonCode).toBe('RECURRENCE_REQUIRES_SCHEDULING_POLICY');
    expect(operation([service({ recurrenceMode: 'ANNUAL' })], [activity({ status: 'termine' })])[0])
      .toMatchObject({ action: 'REQUIRES_DECISION', reasonCode: 'QUANTITY_REQUIRES_SCHEDULING_POLICY' });
  });
  it('handles removed services without mutating linked Activities', () => {
    expect(operation([service({ commercialStatus: 'REMOVED' })])[0]).toMatchObject({ action: 'NO_ACTION',
      reasonCode: 'SERVICE_REMOVED_NO_ACTIVE_ACTIVITY' });
    expect(operation([service({ commercialStatus: 'REMOVED' })], [activity()])[0]).toMatchObject({
      action: 'REQUIRES_DECISION', reasonCode: 'SERVICE_REMOVED_WITH_ACTIVE_ACTIVITY' });
  });
  it('blocks archived types only when creation is needed and blocks invalid contexts', () => {
    expect(operation([service({ activityType: { id: 'type-a', isActive: false, organizationId: 'org-a' } })])[0])
      .toMatchObject({ action: 'BLOCKED', reasonCode: 'ACTIVITY_TYPE_ARCHIVED' });
    expect(operation([service({ activityType: null })])[0]).toMatchObject({ action: 'BLOCKED', reasonCode: 'ACTIVITY_TYPE_MISSING' });
    expect(operation([service({ activityType: { id: 'type-a', isActive: true, organizationId: 'org-b' } })])[0])
      .toMatchObject({ action: 'BLOCKED', reasonCode: 'SERVICE_CONTEXT_MISMATCH' });
    expect(operation([service({ activityType: { id: 'type-a', isActive: false, organizationId: 'org-a' } })], [activity()])[0])
      .toMatchObject({ action: 'NO_ACTION', reasonCode: 'ACTIVE_ACTIVITY_EXISTS' });
  });
  it('projects canonical Booking planning states and open Booking context', () => {
    const pending = activity({ bookings: [{ status: 'DEMANDEE', assignments: [{ status: 'PENDING' }] }] });
    expect(operation([service()], [pending])[0]).toMatchObject({ hasOpenBooking: true,
      linkedActivities: [expect.objectContaining({ planningStatus: 'LEAD_PENDING' })] });
    expect(operation([service()], [activity({ bookings: [{ status: 'DEMANDEE', assignments: [{ status: 'ACCEPTED' }] }] })])[0]
      .linkedActivities[0].planningStatus).toBe('PLANNED');
    expect(operation([service()], [activity({ bookings: [{ status: 'CONFIRMEE', assignments: [{ status: 'ACCEPTED' }] }] })])[0]
      .linkedActivities[0].planningStatus).toBe('CONFIRMED');
  });
});
