import { DisplayPdfRenderJobService } from './display-pdf-render-job.service';

describe('DisplayPdfRenderJobService', () => {
  it('recovers only stale retryable processing jobs', async () => {
    const updateMany: jest.MockedFunction<
      (args: unknown) => Promise<{ count: number }>
    > = jest.fn().mockResolvedValue({ count: 1 });
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
    const call = updateMany.mock.calls[0]?.[0] as {
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
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'job-b',
        organizationId: 'tenant-a',
        buildingId: 'building-a',
      },
    });
  });
});
