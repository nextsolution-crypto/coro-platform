import { VersionsService } from './versions.service';

describe('VersionsService metadata boundary', () => {
  it('does not return snapshots from the version list', async () => {
    const $queryRaw = jest.fn().mockResolvedValue([
      { id: 'v1', versionNumber: 1, label: 'v1', createdAt: new Date(), approvedBy: 'A', approvedAt: null, signedBy: null, signedAt: null, signedEmail: null },
    ]);
    const prisma = {
      $queryRaw,
      projectComment: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const integrity = {
      readableProject: jest.fn().mockResolvedValue({ id: 'p1' }),
    } as any;
    const service = new VersionsService(prisma, integrity, {} as any);

    const result = await service.findAll('p1', {
      userId: 'u1',
      organizationId: 'o1',
      role: 'ADMIN',
    });

    // Seuls quelques champs du snapshot sont extraits, jamais le document.
    const query = $queryRaw.mock.calls[0][0];
    const sql = String(query.sql ?? query.strings?.join('?') ?? query);
    expect(sql).toContain(`"snapshot"->>'approvedBy'`);
    expect(sql).not.toMatch(/"snapshot"\s*,|"snapshot"\s*FROM/);
    expect(result[0]).not.toHaveProperty('snapshot');
    expect(result[0]).toMatchObject({ versionNumber: 1, approvedBy: 'A', status: 'AWAITING_SIGNATURE' });
  });
});
