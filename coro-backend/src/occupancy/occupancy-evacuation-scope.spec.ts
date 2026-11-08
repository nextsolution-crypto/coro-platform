import { OccupancyService } from './occupancy.service';

describe('Sentinelle evacuation mutation scope', () => {
  const prisma = {
    evacuationCheckIn: { findFirst: jest.fn(), update: jest.fn() },
    evacuationEvent: { findFirst: jest.fn(), update: jest.fn() },
  };
  const service = new OccupancyService(prisma as any);
  beforeEach(() => jest.resetAllMocks());
  it('scopes accounting to an active event in the caller organization', async () => {
    prisma.evacuationCheckIn.findFirst.mockResolvedValue(null);
    await expect(
      service.accountForOccupant(
        {
          evacuationEventId: 'event-a',
          occupantRecordId: 'record-a',
          checkedBy: 'QA',
        },
        'org-b',
      ),
    ).rejects.toThrow();
    expect(prisma.evacuationCheckIn.findFirst).toHaveBeenCalledWith({
      where: {
        evacuationEventId: 'event-a',
        evacuationEvent: { organizationId: 'org-b', status: 'ACTIVE' },
        occupantRecordId: 'record-a',
      },
    });
    expect(prisma.evacuationCheckIn.update).not.toHaveBeenCalled();
  });
  it('rejects closure of an event outside the caller organization', async () => {
    prisma.evacuationEvent.findFirst.mockResolvedValue(null);
    await expect(
      service.resolveEvacuation('event-a', 'org-b'),
    ).rejects.toThrow();
    expect(prisma.evacuationEvent.update).not.toHaveBeenCalled();
  });
  it('allows closure only after resolving an active scoped event', async () => {
    prisma.evacuationEvent.findFirst.mockResolvedValue({ id: 'event-a' });
    await service.resolveEvacuation('event-a', 'org-a');
    expect(prisma.evacuationEvent.findFirst).toHaveBeenCalledWith({
      where: { id: 'event-a', organizationId: 'org-a', status: 'ACTIVE' },
      select: { id: true },
    });
  });
});
