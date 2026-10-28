import { VersionsService } from './versions.service';

describe('VersionsService metadata boundary', () => {
  it('does not return snapshots from the version list', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { id: 'v1', versionNumber: 1, label: 'v1', createdAt: new Date() },
      ]);
    const prisma = { projectVersion: { findMany } } as any;
    const integrity = {
      readableProject: jest.fn().mockResolvedValue({ id: 'p1' }),
    } as any;
    const service = new VersionsService(prisma, integrity, {} as any);

    await service.findAll('p1', {
      userId: 'u1',
      organizationId: 'o1',
      role: 'ADMIN',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, versionNumber: true, label: true, createdAt: true },
      }),
    );
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty('snapshot');
  });
});
