import { ForbiddenException } from '@nestjs/common';
jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalService booking scope', () => {
  const actor = { sub: 'client-user', clientId: 'client-a', organizationId: 'org-a', role: 'CLIENT_MANAGER', buildingIds: ['building-a'] };
  let service: ClientPortalService;
  let bookingsService: any;

  beforeEach(() => {
    service = Object.create(ClientPortalService.prototype);
    bookingsService = { createBooking: jest.fn(), getBookingForClientCancellation: jest.fn(), cancelBooking: jest.fn() };
    (service as any).bookingsService = bookingsService;
    (service as any).prisma = { projectActivity: { findFirst: jest.fn() } };
    jest.spyOn(service, 'getProject').mockResolvedValue(null as any);
  });

  it('rejects creation for a project in another organization', async () => {
    await expect(service.createBookingFromClient({ projectId: 'foreign', clientUserId: actor.sub, activityType: 'visite', requestedDate: new Date(), duration: 60, actor })).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getProject).toHaveBeenCalledWith('foreign', 'client-a', 'org-a', 'CLIENT_MANAGER');
    expect(bookingsService.createBooking).not.toHaveBeenCalled();
  });

  it('rejects creation outside the manager building scope', async () => {
    (service.getProject as jest.Mock).mockResolvedValue({ id: 'project', buildingId: 'building-b' });
    await expect(service.createBookingFromClient({ projectId: 'project', clientUserId: actor.sub, activityType: 'visite', requestedDate: new Date(), duration: 60, actor })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a booking for an accessible project', async () => {
    (service.getProject as jest.Mock).mockResolvedValue({ id: 'project', buildingId: 'building-a' });
    await service.createBookingFromClient({ projectId: 'project', clientUserId: actor.sub, activityType: 'visite', requestedDate: new Date(), duration: 60, actor });
    expect(bookingsService.createBooking).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project', clientUserId: actor.sub }));
  });

  it.each([
    [{ clientVisible: false, clientBookable: true }, 'hidden'],
    [{ clientVisible: true, clientBookable: false }, 'not bookable'],
    [{ status: 'termine' }, 'complete'],
    [{ status: 'annule' }, 'cancelled'],
    [{ project: { clientId: 'other', buildingId: 'building-a' } }, 'other client'],
    [{ project: { clientId: 'client-a', buildingId: 'building-b' } }, 'other building'],
  ])('rejects activity booking when %s (%s)', async (change) => {
    const activity = { id: 'activity', projectId: 'project', type: 'exercice_table', status: 'a_faire', clientVisible: true, clientBookable: true,
      project: { clientId: 'client-a', buildingId: 'building-a' }, ...change };
    (service as any).prisma.projectActivity.findFirst.mockResolvedValue(activity);
    await expect(service.createBookingForActivity({ activityId: 'activity', actor, requestedDate: new Date(), duration: 60 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingsService.createBooking).not.toHaveBeenCalled();
  });

  it('derives the project and booking type from an accessible Activity', async () => {
    (service as any).prisma.projectActivity.findFirst.mockResolvedValue({ id: 'activity', projectId: 'project', type: 'exercice_table', status: 'a_faire', clientVisible: true, clientBookable: true,
      project: { clientId: 'client-a', buildingId: 'building-a' } });
    await service.createBookingForActivity({ activityId: 'activity', actor, requestedDate: new Date(), duration: 60 });
    expect(bookingsService.createBooking).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project', activityId: 'activity', activityType: 'exercice', clientUserId: actor.sub }));
  });

  it('rejects an Activity outside the organization', async () => {
    (service as any).prisma.projectActivity.findFirst.mockResolvedValue(null);
    await expect(service.createBookingForActivity({ activityId: 'foreign', actor, requestedDate: new Date(), duration: 60 })).rejects.toBeInstanceOf(ForbiddenException);
    expect((service as any).prisma.projectActivity.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', organizationId: 'org-a' } }));
  });

  it('rejects cancelling a booking outside the requester scope', async () => {
    bookingsService.getBookingForClientCancellation.mockRejectedValue(new ForbiddenException());
    await expect(service.cancelBookingFromClient('foreign-booking', actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingsService.cancelBooking).not.toHaveBeenCalled();
  });

  it('cancels an accessible booking with a server-chosen actor', async () => {
    bookingsService.getBookingForClientCancellation.mockResolvedValue({ projectId: 'project' });
    (service.getProject as jest.Mock).mockResolvedValue({ id: 'project', buildingId: 'building-a' });
    await service.cancelBookingFromClient('booking', actor);
    expect(bookingsService.cancelBooking).toHaveBeenCalledWith('booking', 'client', 'org-a', 'client-user');
  });
});
