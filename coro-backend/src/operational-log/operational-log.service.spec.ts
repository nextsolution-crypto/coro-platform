import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OperationalLogPriority } from '@prisma/client';
import { OperationalLogService, assertPlausibleEventAt } from './operational-log.service';

describe('OperationalLogService', () => {
  const prisma = {
    operationalLogEntry: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    operationalLogEntryRevision: { findUnique: jest.fn(), findMany: jest.fn() },
    buildingFloor: { findFirst: jest.fn() },
    buildingZone: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    incidentReport: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const access = { require: jest.fn(), has: jest.fn().mockResolvedValue(false) };
  const service = new OperationalLogService(prisma as never, access as never);
  const actor = { userId: 'user-a', organizationId: 'org-a' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPERATIONAL_LOG_ENABLED = 'true';
  });
  afterAll(() => delete process.env.OPERATIONAL_LOG_ENABLED);

  it('fails closed when the feature is disabled', async () => {
    process.env.OPERATIONAL_LOG_ENABLED = 'false';
    await expect(
      service.list(
        'org-a',
        { buildingId: 'building-a', page: 1, pageSize: 25 },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a zone without a floor before creating an entry', async () => {
    prisma.operationalLogEntry.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        'org-a',
        {
          buildingId: 'building-a',
          zoneId: 'zone-a',
          eventAt: new Date().toISOString(),
          activityType: 'PATROL',
          category: 'SECURITY',
          priority: OperationalLogPriority.NORMAL,
          description: 'Ronde terminée.',
          idempotencyKey: '11111111-1111-4111-8111-111111111111',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects script-like descriptions before persistence', async () => {
    await expect(
      service.create(
        'org-a',
        {
          buildingId: 'building-a',
          eventAt: new Date().toISOString(),
          activityType: 'PATROL',
          category: 'SECURITY',
          priority: OperationalLogPriority.NORMAL,
          description: '<script>alert(1)</script>',
          idempotencyKey: '11111111-1111-4111-8111-111111111111',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a deterministic bounded page', async () => {
    prisma.operationalLogEntry.findMany.mockResolvedValue([]);
    prisma.operationalLogEntry.count.mockResolvedValue(0);
    await expect(
      service.list(
        'org-a',
        { buildingId: 'building-a', page: 2, pageSize: 20 },
        actor,
      ),
    ).resolves.toEqual({ items: [], page: 2, pageSize: 20, total: 0 });
    expect(prisma.operationalLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ eventAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('preserves optimistic concurrency conflicts', async () => {
    const current = {
      id: 'entry-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      lockVersion: 3,
      description: 'Avant',
      category: 'SECURITY',
      activityType: 'PATROL',
      priority: 'NORMAL',
      authorActorType: 'USER',
      authorActorId: 'user-a',
    };
    prisma.operationalLogEntry.findFirst.mockResolvedValue(current);
    prisma.operationalLogEntryRevision.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({
          coroActorIdentity: { upsert: jest.fn().mockResolvedValue({}) },
          operationalLogEntry: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        }),
    );
    await expect(
      service.update(
        'org-a',
        'entry-a',
        {
          expectedLockVersion: 2,
          correctionReason: 'Correction factuelle',
          description: 'Après',
          idempotencyKey: '22222222-2222-4222-8222-222222222222',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('M8-03 : refuse la correction de l’entrée d’un autre agent sans rôle de superviseur', async () => {
    prisma.operationalLogEntry.findFirst.mockResolvedValue({
      id: 'entry-b', organizationId: 'org-a', buildingId: 'building-a', lockVersion: 1,
      authorActorType: 'USER', authorActorId: 'someone-else',
    });
    access.has.mockResolvedValue(false);
    await expect(
      service.update('org-a', 'entry-b', {
        expectedLockVersion: 1, correctionReason: 'Correction factuelle', description: 'Après',
        idempotencyKey: '33333333-3333-4333-8333-333333333333',
      } as never, actor),
    ).rejects.toThrow('Seul l’auteur');
  });

  it('M8-02 : refuse une heure d’événement future ou de plus de 30 jours', () => {
    const now = Date.parse('2026-11-22T12:00:00Z');
    expect(() => assertPlausibleEventAt('2026-11-22T12:30:00Z', now)).toThrow('futur');
    expect(() => assertPlausibleEventAt('2026-10-01T12:00:00Z', now)).toThrow('30 jours');
    expect(() => assertPlausibleEventAt('2026-11-22T11:00:00Z', now)).not.toThrow();
  });
});
