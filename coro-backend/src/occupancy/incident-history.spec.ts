import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { IncidentHistoryQueryDto, IncidentHistoryStatusFilter } from './incident-history.dto';
import { IncidentService } from './incident.service';

describe('Incident history pagination and minimization', () => {
  const count = jest.fn();
  const findMany = jest.fn();
  const prisma = {
    incidentEvent: { count, findMany },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  } as any;
  const service = new IncidentService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    count
      .mockResolvedValueOnce(62)
      .mockResolvedValueOnce(62)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(12);
    findMany.mockResolvedValue([
      {
        id: 'incident-a', status: IncidentStatus.ACTIVE, type: 'FIRE_ALERT',
        triggeredAt: new Date('2026-11-02T12:00:00Z'), resolvedAt: null,
        procedureCode: 'P003', isExercise: false, rexWentWell: 'ok',
        rexToImprove: null, rexRecommendations: null,
        tasks: [{ status: 'COMPLETED' }, { status: 'PENDING' }],
      },
    ]);
  });

  it('paginates after filters with stable ordering and a minimal response', async () => {
    const query = Object.assign(new IncidentHistoryQueryDto(), {
      page: 2, pageSize: 25, status: IncidentHistoryStatusFilter.OPEN,
      search: 'incendie', sortBy: 'triggeredAt' as const, sortOrder: 'desc' as const,
    });
    const result = await service.getIncidentHistory('building-a', 'org-a', query);

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ buildingId: 'building-a', organizationId: 'org-a', status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] } }) });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 25, take: 25, orderBy: [{ triggeredAt: 'desc' }, { id: 'desc' }],
      select: expect.objectContaining({ id: true, isExercise: true, tasks: expect.any(Object) }),
    }));
    const select = findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('occupantsSnapshot');
    expect(select).not.toHaveProperty('teamSnapshot');
    expect(select).not.toHaveProperty('interventionSheet');
    expect(select).not.toHaveProperty('publicAccessToken');
    expect(result.items[0]).toEqual(expect.objectContaining({ hasRex: true, coordinatorStepsTotal: 2, coordinatorStepsCompleted: 1 }));
    expect(result.items[0]).not.toHaveProperty('rexWentWell');
    expect(result.pagination).toEqual({ page: 2, pageSize: 25, total: 62, totalPages: 3 });
    expect(result.counts).toEqual(expect.objectContaining({ all: 62, open: 50, exercises: 12, real: 50 }));
  });

  it('keeps every type and procedure search inside the authorized building scope', async () => {
    await service.getIncidentHistory('building-a', 'org-a', Object.assign(new IncidentHistoryQueryDto(), { search: 'P003' }));
    expect(count.mock.calls[0][0].where).toEqual(expect.objectContaining({ buildingId: 'building-a', organizationId: 'org-a', OR: expect.any(Array) }));
  });
});

describe('IncidentHistoryQueryDto validation', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it('transforms valid bounded query parameters', async () => {
    const query = await pipe.transform({ page: '3', pageSize: '100', status: 'OPEN', sortBy: 'type', sortOrder: 'asc' }, { type: 'query', metatype: IncidentHistoryQueryDto } as any);
    expect(query).toEqual(expect.objectContaining({ page: 3, pageSize: 100, status: 'OPEN', sortBy: 'type', sortOrder: 'asc' }));
  });

  it.each([{ page: '0' }, { page: '100001' }, { pageSize: '101' }, { sortBy: 'secret' }, { status: 'UNKNOWN' }])('rejects invalid parameters: %p', async (value) => {
    await expect(pipe.transform(value, { type: 'query', metatype: IncidentHistoryQueryDto } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
