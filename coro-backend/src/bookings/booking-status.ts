export const BOOKING_STATUSES = ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE', 'REFUSEE', 'COMPLETEE', 'ANNULEE'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  DEMANDEE: ['CONFIRMEE', 'REFUSEE', 'REPORTEE', 'REASSIGNEE', 'ANNULEE'],
  CONFIRMEE: ['REPORTEE', 'REASSIGNEE', 'COMPLETEE', 'ANNULEE'],
  REPORTEE: ['CONFIRMEE', 'REPORTEE', 'REASSIGNEE', 'COMPLETEE', 'ANNULEE'],
  REASSIGNEE: ['CONFIRMEE', 'REPORTEE', 'REASSIGNEE', 'COMPLETEE', 'ANNULEE'],
  REFUSEE: [],
  COMPLETEE: [],
  ANNULEE: [],
};
export function effectiveBookingDate(booking: { requestedDate: Date; reportedDate?: Date | null }): Date {
  return booking.reportedDate ?? booking.requestedDate;
}
