import { BadRequestException } from '@nestjs/common';
import { OccupancyService, summarizeAccountability } from './occupancy.service';

describe('Evacuation accountability states (audit M5-04, M5-05)', () => {
  function harness(checkin: any = { id: 'checkin-1', status: 'PENDING', note: null, lastKnownLocation: null, reportedToFireAt: null }) {
    const prisma: any = {
      evacuationCheckIn: {
        findFirst: jest.fn().mockResolvedValue(checkin),
        update: jest.fn((args) => args),
        count: jest.fn().mockResolvedValue(0),
      },
      evacuationAccountabilityEvent: { create: jest.fn((args) => args) },
      evacuationEvent: {
        findFirst: jest.fn().mockResolvedValue({ id: 'event-1' }),
        update: jest.fn((args) => args),
      },
      $transaction: jest.fn(async (ops: any[]) => ops),
    };
    const service = new OccupancyService(prisma);
    const actor = { type: 'CLIENT_USER', id: 'client-user-1', name: 'Martin Session' };
    return { service, prisma, actor };
  }

  it('records a missing person with last known location, fire report time and a journal entry', async () => {
    const { service, prisma, actor } = harness();
    await service.setAccountabilityStatus(
      { evacuationEventId: 'event-1', occupantRecordId: 'record-1', status: 'MISSING', lastKnownLocation: '3e étage, salle 304', reportedToFire: true },
      'org-1',
      actor,
    );
    const update = prisma.evacuationCheckIn.update.mock.calls[0][0];
    expect(update.data).toMatchObject({ status: 'MISSING', isAccountedFor: false, checkedBy: 'Martin Session', lastKnownLocation: '3e étage, salle 304' });
    expect(update.data.reportedToFireAt).toBeInstanceOf(Date);
    expect(prisma.evacuationAccountabilityEvent.create.mock.calls[0][0].data).toMatchObject({
      fromStatus: 'PENDING', toStatus: 'MISSING', actorType: 'CLIENT_USER', actorId: 'client-user-1', reportedToFire: true,
    });
  });

  it('requires a last known location for a missing person', async () => {
    const { service, actor } = harness();
    await expect(
      service.setAccountabilityStatus({ evacuationEventId: 'event-1', occupantRecordId: 'record-1', status: 'MISSING' }, 'org-1', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a correction adds a journal entry instead of rewriting history', async () => {
    const { service, prisma, actor } = harness({ id: 'checkin-1', status: 'PRESENT', note: null, lastKnownLocation: null, reportedToFireAt: null });
    await service.setAccountabilityStatus({ evacuationEventId: 'event-1', occupantRecordId: 'record-1', status: 'PENDING', note: 'Coché par erreur' }, 'org-1', actor);
    expect(prisma.evacuationCheckIn.update.mock.calls[0][0].data).toMatchObject({ status: 'PENDING', isAccountedFor: false });
    expect(prisma.evacuationAccountabilityEvent.create.mock.calls[0][0].data).toMatchObject({ fromStatus: 'PRESENT', toStatus: 'PENDING', note: 'Coché par erreur' });
  });

  it('rejects an unknown state', async () => {
    const { service, actor } = harness();
    await expect(
      service.setAccountabilityStatus({ evacuationEventId: 'event-1', occupantRecordId: 'record-1', status: 'GONE' }, 'org-1', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to close with people to confirm or missing unless a reason is given', async () => {
    const { service, prisma } = harness();
    prisma.evacuationCheckIn.count.mockResolvedValue(2);
    await expect(service.resolveEvacuation('event-1', 'org-1')).rejects.toThrow('2 personne(s)');
    await expect(service.resolveEvacuation('event-1', 'org-1', { closureReason: 'court' })).rejects.toBeInstanceOf(BadRequestException);
    await service.resolveEvacuation('event-1', 'org-1', { closureReason: 'Liste remise au capitaine des pompiers à 10 h 12', actorName: 'Martin Session' });
    expect(prisma.evacuationEvent.update.mock.calls[0][0].data).toMatchObject({
      status: 'RESOLVED', closureReason: 'Liste remise au capitaine des pompiers à 10 h 12', resolvedBy: 'Martin Session',
    });
  });

  it('summarizes states and prepares the fire department brief', () => {
    const summary = summarizeAccountability([
      { occupantRecordId: 'a', status: 'PRESENT', isAccountedFor: true, occupantRecord: { firstName: 'A', lastName: 'Un' } },
      { occupantRecordId: 'b', status: 'MISSING', isAccountedFor: false, lastKnownLocation: '2e', occupantRecord: { firstName: 'B', lastName: 'Deux', floor: '2' } },
      { occupantRecordId: 'c', status: 'INJURED', isAccountedFor: true, occupantRecord: { firstName: 'C', lastName: 'Trois' } },
      { occupantRecordId: 'd', status: 'PENDING', isAccountedFor: false, occupantRecord: { firstName: 'D', lastName: 'Quatre' } },
    ]);
    expect(summary.counts).toMatchObject({ PRESENT: 1, MISSING: 1, INJURED: 1, PENDING: 1 });
    expect(summary.accounted).toBe(2);
    expect(summary.missing).toBe(2);
    expect(summary.fireBrief.missing).toEqual([expect.objectContaining({ name: 'B Deux', lastKnownLocation: '2e', floor: '2' })]);
    expect(summary.fireBrief.injured.map((p) => p.name)).toEqual(['C Trois']);
    expect(summary.fireBrief.pending.map((p) => p.name)).toEqual(['D Quatre']);
  });
});
