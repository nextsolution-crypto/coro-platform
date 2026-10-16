export type CustomerSafeBookingStatus =
  | 'DEMANDEE'
  | 'CONFIRMEE'
  | 'REPORTEE'
  | 'REASSIGNEE'
  | 'REFUSEE'
  | 'ANNULEE'
  | 'COMPLETEE';

type CustomerBookingSource = {
  id: string;
  projectId: string;
  activityId?: string | null;
  activityType: string;
  requestedDate: Date;
  reportedDate?: Date | null;
  duration: number;
  participants?: number | null;
  comment?: string | null;
  status: string;
  refuseReason?: string | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    building?: {
      id: string;
      name: string;
      timeZone?: string | null;
    } | null;
  };
};

export type CustomerSafeBookingProjection = {
  id: string;
  projectId: string;
  activityId: string | null;
  activityType: string;
  requestedDate: Date;
  reportedDate: Date | null;
  duration: number;
  participants: number | null;
  comment: string | null;
  status: CustomerSafeBookingStatus;
  refuseReason: string | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    building: {
      id: string;
      name: string;
      timeZone: string | null;
    } | null;
  };
};

const CUSTOMER_SAFE_STATUSES = new Set<CustomerSafeBookingStatus>([
  'DEMANDEE',
  'CONFIRMEE',
  'REPORTEE',
  'REASSIGNEE',
  'REFUSEE',
  'ANNULEE',
  'COMPLETEE',
]);

export function toCustomerSafeBooking(
  booking: CustomerBookingSource,
): CustomerSafeBookingProjection {
  if (
    !CUSTOMER_SAFE_STATUSES.has(booking.status as CustomerSafeBookingStatus)
  ) {
    throw new Error('Unsupported customer Booking status');
  }

  return {
    id: booking.id,
    projectId: booking.projectId,
    activityId: booking.activityId ?? null,
    activityType: booking.activityType,
    requestedDate: booking.requestedDate,
    reportedDate: booking.reportedDate ?? null,
    duration: booking.duration,
    participants: booking.participants ?? null,
    comment: booking.comment ?? null,
    status: booking.status as CustomerSafeBookingStatus,
    refuseReason: booking.refuseReason ?? null,
    createdAt: booking.createdAt,
    project: {
      id: booking.project.id,
      name: booking.project.name,
      building: booking.project.building
        ? {
            id: booking.project.building.id,
            name: booking.project.building.name,
            timeZone: booking.project.building.timeZone ?? null,
          }
        : null,
    },
  };
}
