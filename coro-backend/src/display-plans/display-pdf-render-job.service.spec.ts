import { DisplayPdfRenderJobService } from './display-pdf-render-job.service';

describe('DisplayPdfRenderJobService', () => {
  it('recovers only stale retryable processing jobs', async () => {
    const updateMany: jest.MockedFunction<
      (args: unknown) => Promise<{ count: number }>
    > = jest
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    const service = new DisplayPdfRenderJobService(
      { displayPdfRenderJob: { updateMany } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const staleBefore = new Date('2026-01-01T00:00:00Z');
    await expect(service.recoverAbandoned(staleBefore)).resolves.toEqual({
      count: 1,
    });
    expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        status: 'PROCESSING',
        heartbeatAt: { lt: staleBefore },
        attempts: { gte: 3 },
      },
      data: { status: 'FAILED', failureCode: 'LEASE_EXHAUSTED' },
    });
    const call = updateMany.mock.calls[1]?.[0] as {
      where: unknown;
      data: { nextAttemptAt: Date };
    };
    expect(call).toEqual({
      where: {
        status: 'PROCESSING',
        heartbeatAt: { lt: staleBefore },
        attempts: { lt: 3 },
      },
      data: {
        status: 'PENDING',
        claimedBy: null,
        claimedAt: null,
        heartbeatAt: null,
        nextAttemptAt: call.data.nextAttemptAt,
      },
    });
    expect(call.data.nextAttemptAt).toBeInstanceOf(Date);
  });

  it('does not expose a cross-tenant job', async () => {
    const requirePermission = jest.fn().mockResolvedValue(undefined);
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new DisplayPdfRenderJobService(
      { displayPdfRenderJob: { findFirst } } as never,
      {} as never,
      { require: requirePermission } as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.get('tenant-a', 'building-a', 'job-b', {
        userId: 'user-a',
      } as never),
    ).rejects.toThrow('Travail PDF introuvable.');
    const query = (
      findFirst.mock.calls as unknown as Array<
        [{ where: Record<string, string>; select: Record<string, boolean> }]
      >
    )[0][0];
    expect(query.where).toEqual({
      id: 'job-b',
      organizationId: 'tenant-a',
      buildingId: 'building-a',
    });
    expect(query.select).toMatchObject({
      id: true,
      status: true,
      outputSha256: true,
    });
  });

  it('does not expose source or storage authority through job status', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'job-a', status: 'PENDING' });
    const service = new DisplayPdfRenderJobService(
      { displayPdfRenderJob: { findFirst } } as never,
      {} as never,
      { require: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    await service.get('tenant-a', 'building-a', 'job-a', {
      userId: 'user-a',
    } as never);
    const selection = (
      findFirst.mock.calls as unknown as Array<
        [{ select: Record<string, boolean> }]
      >
    )[0][0].select;
    expect(selection).toBeDefined();
    expect(selection).not.toHaveProperty('sourceStorageKey');
    expect(selection).not.toHaveProperty('outputStorageKey');
    expect(selection).not.toHaveProperty('sourceProjectFileId');
  });
});
