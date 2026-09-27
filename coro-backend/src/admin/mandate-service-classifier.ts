export type Classification = 'SAFE_AUTO' | 'AMBIGUOUS' | 'NO_ACTION' | 'DATA_INTEGRITY_ERROR';

export type HistoricalActivity = {
  id: string; organizationId: string; projectId: string; projectOrganizationId: string;
  projectName: string; projectReference?: string | null; projectMandateId: string | null;
  activityTypeId: string | null; activityTypeName: string | null; activityTypeOrganizationId: string | null;
  activityTypeExists: boolean; sourceMandate: boolean; status: string; scheduledDate: Date | null;
  createdAt: Date; isRecurring: boolean; mandateServiceId: string | null;
  linkedServiceConsistent: boolean; bookingCount: number; taskListCount: number; taskCount: number;
  timeEntryCount: number; timeHours: number; hasExerciseReport: boolean;
  existingServices: Array<{ id: string; activityTypeId: string; commercialStatus: string }>;
};

export type ClassificationGroup = {
  organizationId: string; projectId: string; projectName: string; projectReference: string | null;
  projectMandateId: string | null; activityTypeId: string | null; activityTypeName: string | null;
  activityCount: number; activityIds: string[]; statuses: string[]; sourceMandate: boolean[];
  scheduledDates: Array<string | null>; createdAt: string[]; bookingCount: number; taskListCount: number;
  taskCount: number; timeEntryCount: number; timeHours: number; exerciseReportCount: number;
  mandateServiceIds: string[]; existingServiceIds: string[]; isRecurringIndicators: number;
  suggestedRecurrence: null; suggestedQuantity: null; snapshotSource: 'CURRENT_ACTIVITY_TYPE' | null;
  classification: Classification; reasonCodes: string[];
};

const cancelled = (status: string) => ['annule', 'ANNULEE', 'CANCELLED'].includes(status);

export function classifyHistoricalActivities(input: HistoricalActivity[]): ClassificationGroup[] {
  const grouped = new Map<string, HistoricalActivity[]>();
  for (const activity of input) {
    const key = `${activity.organizationId}\0${activity.projectId}\0${activity.activityTypeId ?? 'NULL'}`;
    grouped.set(key, [...(grouped.get(key) ?? []), activity]);
  }
  return [...grouped.values()].map(activities => {
    const first = activities[0];
    const reasons: string[] = [];
    let classification: Classification;
    const services = [...new Map(activities.flatMap(item => item.existingServices).map(item => [item.id, item])).values()];
    const linkedIds = [...new Set(activities.flatMap(item => item.mandateServiceId ? [item.mandateServiceId] : []))];
    const hasIntegrityError = !first.projectMandateId || activities.some(item =>
      item.projectOrganizationId !== item.organizationId ||
      (item.activityTypeId !== null && !item.activityTypeExists) ||
      (item.activityTypeExists && item.activityTypeOrganizationId !== null && item.activityTypeOrganizationId !== item.organizationId) ||
      (item.mandateServiceId !== null && !item.linkedServiceConsistent));

    if (activities.some(item => !item.sourceMandate)) {
      classification = 'NO_ACTION'; reasons.push('NOT_MANDATE_SOURCE');
    } else if (first.activityTypeId === null) {
      classification = 'NO_ACTION'; reasons.push('LEGACY_TYPE_MISSING');
    } else if (hasIntegrityError) {
      classification = 'DATA_INTEGRITY_ERROR';
      if (!first.projectMandateId) reasons.push('MANDATE_MISSING');
      if (activities.some(item => !item.activityTypeExists)) reasons.push('ACTIVITY_TYPE_MISSING');
      if (activities.some(item => item.projectOrganizationId !== item.organizationId ||
        (item.activityTypeOrganizationId !== null && item.activityTypeOrganizationId !== item.organizationId))) reasons.push('TENANT_MISMATCH');
      if (activities.some(item => item.mandateServiceId !== null && !item.linkedServiceConsistent)) reasons.push('SERVICE_LINK_INCONSISTENT');
    } else if (services.length) {
      const fullyLinked = activities.every(item => item.mandateServiceId && item.linkedServiceConsistent);
      classification = fullyLinked ? 'NO_ACTION' : 'AMBIGUOUS';
      reasons.push('SERVICE_ALREADY_EXISTS');
      if (!fullyLinked) reasons.push('SERVICE_LINK_INCONSISTENT');
    } else if (activities.length > 1) {
      classification = 'AMBIGUOUS'; reasons.push('MULTIPLE_ACTIVITIES');
      if (activities.some(item => cancelled(item.status)) && activities.some(item => !cancelled(item.status))) reasons.push('ACTIVE_AND_CANCELLED');
    } else if (cancelled(first.status)) {
      classification = 'AMBIGUOUS'; reasons.push('SINGLE_CANCELLED');
    } else {
      classification = 'SAFE_AUTO'; reasons.push('SAFE_SINGLE_ACTIVE');
    }

    return {
      organizationId: first.organizationId, projectId: first.projectId, projectName: first.projectName,
      projectReference: first.projectReference ?? null, projectMandateId: first.projectMandateId,
      activityTypeId: first.activityTypeId, activityTypeName: first.activityTypeName,
      activityCount: activities.length, activityIds: activities.map(item => item.id),
      statuses: activities.map(item => item.status), sourceMandate: activities.map(item => item.sourceMandate),
      scheduledDates: activities.map(item => item.scheduledDate?.toISOString() ?? null),
      createdAt: activities.map(item => item.createdAt.toISOString()),
      bookingCount: activities.reduce((sum, item) => sum + item.bookingCount, 0),
      taskListCount: activities.reduce((sum, item) => sum + item.taskListCount, 0),
      taskCount: activities.reduce((sum, item) => sum + item.taskCount, 0),
      timeEntryCount: activities.reduce((sum, item) => sum + item.timeEntryCount, 0),
      timeHours: activities.reduce((sum, item) => sum + item.timeHours, 0),
      exerciseReportCount: activities.filter(item => item.hasExerciseReport).length,
      mandateServiceIds: linkedIds, existingServiceIds: services.map(item => item.id),
      isRecurringIndicators: activities.filter(item => item.isRecurring).length,
      suggestedRecurrence: null, suggestedQuantity: null,
      snapshotSource: first.activityTypeExists ? 'CURRENT_ACTIVITY_TYPE' as const : null,
      classification, reasonCodes: reasons,
    };
  }).sort((a, b) => a.organizationId.localeCompare(b.organizationId) || a.projectId.localeCompare(b.projectId)
    || (a.activityTypeId ?? '').localeCompare(b.activityTypeId ?? ''));
}
