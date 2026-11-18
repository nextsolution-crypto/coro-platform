import { OperationalShiftsService } from './operational-shifts.service';
import { HandoverDecision } from './dto/operational-shifts.dto';

describe('OperationalShiftsService CLIENT_USER provenance', () => {
  beforeEach(() => {
    process.env.OPERATIONAL_SHIFTS_ENABLED = 'true';
  });
  afterEach(() => {
    delete process.env.OPERATIONAL_SHIFTS_ENABLED;
  });

  it('persists the canonical incoming ClientUser without a substitute User', async () => {
    const authority = {
      actorType: 'CLIENT_USER' as const,
      actorId: 'client-incoming',
      clientId: 'client-a',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER' as const,
      sessionVersion: 1,
      permissions: [],
      buildingIds: ['building-a'],
    };
    const handover = {
      id: 'handover-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      outgoingActorType: 'CLIENT_USER',
      outgoingActorId: 'client-outgoing',
      incomingActorType: 'CLIENT_USER',
      incomingActorId: authority.actorId,
      incomingShiftId: null,
      status: 'SUBMITTED',
    };
    const tx = {
      coroActorIdentity: { upsert: jest.fn().mockResolvedValue({}) },
      operationalHandoverAction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      operationalHandover: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...handover, status: 'ACKNOWLEDGED' }),
      },
    };
    const prisma = {
      operationalHandover: { findFirst: jest.fn().mockResolvedValue(handover) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const access = {
      require: jest.fn().mockResolvedValue(undefined),
      deny: jest.fn(),
    };
    const service = new OperationalShiftsService(
      prisma as never,
      access as never,
    );

    await service.decideHandover(
      'org-a',
      'handover-a',
      {
        decision: HandoverDecision.ACKNOWLEDGED,
        lockVersion: 0,
        idempotencyKey: 'decision-a',
      },
      authority,
    );

    expect(tx.operationalHandover.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally dynamic test values.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          incomingUserId: null,
          incomingActorType: 'CLIENT_USER',
          incomingActorId: authority.actorId,
        }),
      }),
    );
    expect(tx.operationalHandoverAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally dynamic test values.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          actorUserId: null,
          actorType: 'CLIENT_USER',
          actorId: authority.actorId,
        }),
      }),
    );
  });

  it('refuses a different client identity when an incoming actor is designated', async () => {
    const prisma = {
      operationalHandover: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'handover-a',
          organizationId: 'org-a',
          buildingId: 'building-a',
          outgoingActorType: 'CLIENT_USER',
          outgoingActorId: 'client-outgoing',
          incomingActorType: 'CLIENT_USER',
          incomingActorId: 'client-expected',
        }),
      },
    };
    const hidden = new Error('hidden');
    const access = {
      require: jest.fn().mockResolvedValue(undefined),
      deny: jest.fn(() => {
        throw hidden;
      }),
    };
    const service = new OperationalShiftsService(
      prisma as never,
      access as never,
    );
    await expect(
      service.decideHandover(
        'org-a',
        'handover-a',
        {
          decision: HandoverDecision.ACKNOWLEDGED,
          lockVersion: 0,
          idempotencyKey: 'decision-b',
        },
        {
          actorType: 'CLIENT_USER',
          actorId: 'client-other',
          clientId: 'client-a',
          organizationId: 'org-a',
          role: 'CLIENT_MANAGER',
          sessionVersion: 1,
          permissions: [],
          buildingIds: ['building-a'],
        },
      ),
    ).rejects.toBe(hidden);
  });
});
