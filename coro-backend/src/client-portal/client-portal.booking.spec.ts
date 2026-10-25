import { ForbiddenException } from '@nestjs/common';
jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalService booking scope', () => {
  const actor = {
    sub: 'client-user',
    clientId: 'client-a',
    organizationId: 'org-a',
    role: 'CLIENT_MANAGER',
    buildingIds: ['building-a'],
  };
  const internalBooking = {
    id: 'booking',
    projectId: 'project',
    activityId: null,
    activityType: 'visite',
    requestedDate: new Date('2027-03-01T15:00:00.000Z'),
    reportedDate: null,
    duration: 60,
    participants: 2,
    comment: 'Synthetic',
    status: 'DEMANDEE',
    refuseReason: null,
    createdAt: new Date('2027-02-01T12:00:00.000Z'),
    assignedUserId: 'advisor-private',
    assignedUser: {
      id: 'advisor-private',
      firstName: 'Private',
      lastName: 'Advisor',
      email: 'advisor@booking-gate.invalid',
    },
    assignments: [{ id: 'assignment-private', status: 'PENDING' }],
    pendingCommitmentVersionId: 'commitment-private',
    pendingCommitmentVersion: { canonicalFingerprint: 'fingerprint-private' },
    project: {
      id: 'project',
      name: 'Synthetic project',
      building: {
        id: 'building-a',
        name: 'Synthetic building',
        timeZone: 'America/Toronto',
      },
    },
  };
  let service: ClientPortalService;
  let bookingsService: any;

  beforeEach(() => {
    service = Object.create(ClientPortalService.prototype);
    bookingsService = {
      createBooking: jest.fn().mockResolvedValue(internalBooking),
      getBookingsForClient: jest.fn().mockResolvedValue([internalBooking]),
      getBookingForClientCancellation: jest.fn(),
      cancelBooking: jest.fn().mockResolvedValue({ success: true }),
    };
    (service as any).bookingsService = bookingsService;
    (service as any).prisma = { projectActivity: { findFirst: jest.fn() } };
    jest.spyOn(service, 'getProject').mockResolvedValue(null as any);
  });

  it('rejects creation for a project in another organization', async () => {
    await expect(
      service.createBookingFromClient({
        projectId: 'foreign',
        clientUserId: actor.sub,
        activityType: 'visite',
        requestedDate: new Date(),
        duration: 60,
        actor,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getProject).toHaveBeenCalledWith(
      'foreign',
      'client-a',
      'org-a',
      'CLIENT_MANAGER',
      ['building-a'],
    );
    expect(bookingsService.createBooking).not.toHaveBeenCalled();
  });

  it('rejects creation outside the manager building scope', async () => {
    (service.getProject as jest.Mock).mockResolvedValue({
      id: 'project',
      buildingId: 'building-b',
    });
    await expect(
      service.createBookingFromClient({
        projectId: 'project',
        clientUserId: actor.sub,
        activityType: 'visite',
        requestedDate: new Date(),
        duration: 60,
        actor,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a booking for an accessible project', async () => {
    (service.getProject as jest.Mock).mockResolvedValue({
      id: 'project',
      buildingId: 'building-a',
    });
    const result = await service.createBookingFromClient({
      projectId: 'project',
      clientUserId: actor.sub,
      activityType: 'visite',
      requestedDate: new Date(),
      duration: 60,
      actor,
    });
    expect(bookingsService.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project',
        clientUserId: actor.sub,
      }),
    );
    expect(result).toMatchObject({
      id: 'booking',
      status: 'DEMANDEE',
      duration: 60,
    });
    expect(result).not.toHaveProperty('assignedUser');
    expect(result).not.toHaveProperty('assignedUserId');
  });

  it.each([
    [{ clientVisible: false, clientBookable: true }, 'hidden'],
    [{ clientVisible: true, clientBookable: false }, 'not bookable'],
    [{ status: 'termine' }, 'complete'],
    [{ status: 'annule' }, 'cancelled'],
    [
      { project: { clientId: 'other', buildingId: 'building-a' } },
      'other client',
    ],
    [
      { project: { clientId: 'client-a', buildingId: 'building-b' } },
      'other building',
    ],
  ])('rejects activity booking when %s (%s)', async (change, _reason) => {
    const activity = {
      id: 'activity',
      projectId: 'project',
      type: 'exercice_table',
      status: 'a_faire',
      clientVisible: true,
      clientBookable: true,
      project: { clientId: 'client-a', buildingId: 'building-a' },
      ...change,
    };
    (service as any).prisma.projectActivity.findFirst.mockResolvedValue(
      activity,
    );
    await expect(
      service.createBookingForActivity({
        activityId: 'activity',
        actor,
        requestedDate: new Date(),
        duration: 60,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingsService.createBooking).not.toHaveBeenCalled();
  });

  it('derives the project and booking type from an accessible Activity', async () => {
    (service as any).prisma.projectActivity.findFirst.mockResolvedValue({
      id: 'activity',
      projectId: 'project',
      type: 'exercice_table',
      status: 'a_faire',
      clientVisible: true,
      clientBookable: true,
      project: { clientId: 'client-a', buildingId: 'building-a' },
    });
    const result = await service.createBookingForActivity({
      activityId: 'activity',
      actor,
      requestedDate: new Date(),
      duration: 60,
    });
    expect(bookingsService.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project',
        activityId: 'activity',
        activityType: 'exercice',
        clientUserId: actor.sub,
      }),
    );
    expect(result).not.toHaveProperty('assignedUser');
    expect(result).not.toHaveProperty('assignments');
  });

  it('returns only customer-safe Booking history for the authenticated ClientUser', async () => {
    const result = await service.getBookingsForClient(actor.sub);
    expect(bookingsService.getBookingsForClient).toHaveBeenCalledWith(
      actor.sub,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'booking',
      projectId: 'project',
      status: 'DEMANDEE',
    });
    const serialized = JSON.stringify(result);
    for (const secret of [
      'advisor-private',
      'assignment-private',
      'commitment-private',
      'fingerprint-private',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('rejects an Activity outside the organization', async () => {
    (service as any).prisma.projectActivity.findFirst.mockResolvedValue(null);
    await expect(
      service.createBookingForActivity({
        activityId: 'foreign',
        actor,
        requestedDate: new Date(),
        duration: 60,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (service as any).prisma.projectActivity.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign', organizationId: 'org-a' },
      }),
    );
  });

  it('rejects cancelling a booking outside the requester scope', async () => {
    bookingsService.getBookingForClientCancellation.mockRejectedValue(
      new ForbiddenException(),
    );
    await expect(
      service.cancelBookingFromClient('foreign-booking', actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingsService.cancelBooking).not.toHaveBeenCalled();
  });

  it('cancels an accessible booking with a server-chosen actor', async () => {
    bookingsService.getBookingForClientCancellation.mockResolvedValue({
      projectId: 'project',
    });
    (service.getProject as jest.Mock).mockResolvedValue({
      id: 'project',
      buildingId: 'building-a',
    });
    await expect(
      service.cancelBookingFromClient('booking', actor),
    ).resolves.toEqual({ success: true });
    expect(bookingsService.cancelBooking).toHaveBeenCalledWith(
      'booking',
      {
        type: 'CLIENT',
        id: 'client-user',
        role: 'CLIENT_MANAGER',
        organizationId: 'org-a',
      },
      undefined,
    );
  });

  it('denies cancellation for an archived pilot project before the booking mutation', async () => {
    bookingsService.getBookingForClientCancellation.mockResolvedValue({
      projectId: 'project',
    });
    (service.getProject as jest.Mock).mockResolvedValue({
      id: 'project',
      buildingId: 'building-a',
      status: 'ARCHIVED',
    });
    (service as any).pilotPolicy = {
      assertAllowed: jest.fn(() => {
        throw new ForbiddenException('pilot archive restriction');
      }),
    };

    await expect(
      service.cancelBookingFromClient('booking', actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingsService.cancelBooking).not.toHaveBeenCalled();
  });
});
