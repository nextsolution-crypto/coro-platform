import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { effectiveBookingDate } from './booking-status';

describe('BookingsService security and transitions', () => {
  const project = { id: 'project', organizationId: 'org-a', userId: 'user-a', name: 'Project', user: {}, client: {}, building: {} };
  const booking = {
    id: 'booking', projectId: 'project', organizationId: 'org-a', status: 'DEMANDEE',
    requestedDate: new Date('2026-10-01T13:00:00Z'), reportedDate: null,
    duration: 60, activityType: 'visite',
    project: { name: 'Project', building: null },
    clientUser: { email: 'client@example.com', firstName: 'C', lastName: 'L' },
    assignedUser: { email: 'user@example.com', firstName: 'U', lastName: 'L' },
  };
  let prisma: any;
  let service: BookingsService;

  beforeEach(() => {
    prisma = {
      project: { findUnique: jest.fn().mockResolvedValue(project), findFirst: jest.fn().mockResolvedValue(null) },
      booking: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new BookingsService(prisma);
    jest.spyOn(service as any, 'sendBookingEmail').mockResolvedValue(undefined);
  });

  it('rejects reading a project outside the adviser organization', async () => {
    await expect(service.getBookingsForProject('project', 'org-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({ where: { id: 'project', organizationId: 'org-b' } });
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('rejects modifying a booking outside the adviser organization', async () => {
    await expect(service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'booking', organizationId: 'org-b' } }));
  });

  it('rejects a new adviser from another organization', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'other' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 'other', organizationId: 'org-a', isActive: true } });
  });

  it('rejects an inactive adviser', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'inactive' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 'inactive', organizationId: 'org-a', isActive: true } });
  });

  it('rejects cancelling a booking outside the organization', async () => {
    await expect(service.cancelBooking('booking', 'conseiller', 'org-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'booking', organizationId: 'org-b' } }));
  });

  it('accepts a valid transition and rejects terminal reopening', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue(booking);
    await service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a');
    expect(prisma.booking.update).toHaveBeenCalled();
    prisma.booking.findFirst.mockResolvedValue({ ...booking, status: 'ANNULEE' });
    await expect(service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires report date and replacement user', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(service.updateBookingStatus('booking', { status: 'REPORTEE' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the reported date and a stable ICS UID', () => {
    const reportedDate = new Date('2026-10-02T13:00:00Z');
    expect(effectiveBookingDate({ requestedDate: booking.requestedDate, reportedDate })).toEqual(reportedDate);
    const event = { bookingId: 'booking', sequence: 0, title: 'Visit', description: 'Visit', startDate: booking.requestedDate, durationMinutes: 60, organizerEmail: 'a@example.com', organizerName: 'A', attendeeEmail: 'b@example.com', attendeeName: 'B' };
    const initial = (service as any).generateIcs(event);
    const reported = (service as any).generateIcs({ ...event, sequence: 1, startDate: reportedDate });
    expect(initial).toContain('UID:booking@getcoro.io');
    expect(reported).toContain('UID:booking@getcoro.io');
    expect(reported).toContain('SEQUENCE:1');
  });
});
