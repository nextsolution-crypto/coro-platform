import { mandatePlanningStatus } from './activity-planning-status';

export type PreviewAction = 'NO_ACTION' | 'CREATE_ACTIVITY' | 'REQUIRES_DECISION' | 'BLOCKED';
export type PreviewActivity = { id: string; projectId: string; organizationId: string; activityTypeId: string | null;
  label: string; status: string; scheduledDate: Date | null; createdAt: Date;
  mandateServiceId: string | null; bookings: Array<{ status: string; assignments: Array<{ status: string }> }>;
  taskCount: number; actualHours: number; exerciseReportCount: number };
export type PreviewService = { id: string; projectId: string; organizationId: string; activityTypeId: string;
  commercialStatus: string; recurrenceMode: string; quantity: number; displayOrder: number;
  activityType: { id: string; isActive: boolean; organizationId: string | null } | null };

const active = (item: PreviewActivity) => !['annule', 'fait', 'termine'].includes(item.status);
const completed = (item: PreviewActivity) => ['fait', 'termine'].includes(item.status);
const view = (item: PreviewActivity) => ({ id: item.id, label: item.label, status: item.status,
  scheduledDate: item.scheduledDate, createdAt: item.createdAt, mandateServiceId: item.mandateServiceId,
  planningStatus: mandatePlanningStatus(item), openBooking: item.bookings[0] ? { status: item.bookings[0].status } : null,
  taskCount: item.taskCount, actualHours: item.actualHours, exerciseReportCount: item.exerciseReportCount });

export function previewOperations(services: PreviewService[], activities: PreviewActivity[]) {
  return [...services].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)).map(service => {
    const linked = activities.filter(item => item.mandateServiceId === service.id);
    const legacy = activities.filter(item => item.mandateServiceId === null && item.projectId === service.projectId
      && item.organizationId === service.organizationId && item.activityTypeId === service.activityTypeId);
    const linkedActive = linked.filter(active);
    const linkedCompleted = linked.filter(completed);
    const linkedCancelled = linked.filter(item => item.status === 'annule');
    let action: PreviewAction = 'NO_ACTION'; let reasonCode = 'ACTIVE_ACTIVITY_EXISTS';
    const contextInvalid = !service.activityType || service.projectId === '' || service.organizationId === ''
      || (service.activityType.organizationId !== null && service.activityType.organizationId !== service.organizationId)
      || linked.some(item => item.projectId !== service.projectId || item.organizationId !== service.organizationId
        || item.activityTypeId !== service.activityTypeId);
    if (contextInvalid) { action = 'BLOCKED'; reasonCode = !service.activityType ? 'ACTIVITY_TYPE_MISSING' : 'SERVICE_CONTEXT_MISMATCH'; }
    else if (service.commercialStatus === 'REMOVED') {
      action = linkedActive.length ? 'REQUIRES_DECISION' : 'NO_ACTION';
      reasonCode = linkedActive.length ? 'SERVICE_REMOVED_WITH_ACTIVE_ACTIVITY' : 'SERVICE_REMOVED_NO_ACTIVE_ACTIVITY';
    } else if (linkedActive.length > 1) { action = 'REQUIRES_DECISION'; reasonCode = 'MULTIPLE_ACTIVE_ACTIVITIES'; }
    else if (linkedActive.length === 1) {
      if (service.recurrenceMode === 'ANNUAL' || service.quantity > 1) {
        action = 'REQUIRES_DECISION'; reasonCode = 'QUANTITY_REQUIRES_SCHEDULING_POLICY';
      }
    } else if (linkedCompleted.length) {
      if (service.recurrenceMode === 'ONCE' && service.quantity === 1) reasonCode = 'COMPLETED_ACTIVITY_EXISTS';
      else { action = 'REQUIRES_DECISION'; reasonCode = 'QUANTITY_REQUIRES_SCHEDULING_POLICY'; }
    } else if (linkedCancelled.length) { action = 'REQUIRES_DECISION'; reasonCode = 'LATEST_ACTIVITY_CANCELLED'; }
    else if (legacy.length) { action = 'REQUIRES_DECISION'; reasonCode = legacy.length === 1
      ? 'LEGACY_ACTIVITY_CANDIDATE' : 'LEGACY_MULTIPLE_CANDIDATES'; }
    else if (!service.activityType!.isActive) { action = 'BLOCKED'; reasonCode = 'ACTIVITY_TYPE_ARCHIVED'; }
    else if (service.recurrenceMode === 'ANNUAL' || service.quantity > 1) {
      action = 'REQUIRES_DECISION'; reasonCode = service.recurrenceMode === 'ANNUAL'
        ? 'RECURRENCE_REQUIRES_SCHEDULING_POLICY' : 'QUANTITY_REQUIRES_SCHEDULING_POLICY';
    }
    else { action = 'CREATE_ACTIVITY'; reasonCode = 'NO_ACTIVITY_EXISTS'; }
    const relevant = [...linked, ...legacy];
    const hasOpenBooking = relevant.some(item => item.bookings.length > 0);
    return { serviceId: service.id, activityTypeId: service.activityTypeId, commercialStatus: service.commercialStatus,
      recurrenceMode: service.recurrenceMode, quantity: service.quantity, displayOrder: service.displayOrder,
      action, reasonCode, reasonCodes: [...new Set([reasonCode, ...(hasOpenBooking ? ['OPEN_BOOKING_EXISTS'] : [])])],
      hasOpenBooking, linkedActivities: linked.map(view), legacyCandidates: legacy.map(view) };
  });
}
