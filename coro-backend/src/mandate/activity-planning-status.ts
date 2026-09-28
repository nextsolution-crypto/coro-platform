export type MandatePlanningStatus = 'TO_PLAN' | 'LEAD_PENDING' | 'PLANNED' | 'CONFIRMED';

export function mandatePlanningStatus(activity: { bookings: Array<{ status: string;
  assignments: Array<{ status: string }> }> }): MandatePlanningStatus {
  const booking = activity.bookings[0];
  if (!booking) return 'TO_PLAN';
  const lead = booking.assignments[0];
  if (lead?.status === 'PENDING') return 'LEAD_PENDING';
  if (lead?.status === 'ACCEPTED' && booking.status === 'DEMANDEE') return 'PLANNED';
  return 'CONFIRMED';
}
