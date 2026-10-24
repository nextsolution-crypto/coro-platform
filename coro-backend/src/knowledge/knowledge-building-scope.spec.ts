import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
describe('Knowledge exact requested building context', () => {
  it('does not widen a building-specific question to every authorized building', async () => {
    const prisma: any = {
      projectFileKnowledgeChunk: { findMany: jest.fn(async () => []) },
    };
    const authorization: any = {
      scope: jest.fn(async () => ({
        organizationId: 'org',
        buildingIds: ['a', 'b'],
      })),
      where: jest.fn(() => ({
        organizationId: 'org',
        AND: [{ building: { organizationId: 'org' } }],
      })),
    };
    const service = new KnowledgeRetrievalService(
      prisma,
      authorization,
      { embed: () => [] } as any,
      { maxResults: 8 } as any,
    );
    await service.search(
      {
        type: 'CLIENT_USER',
        id: 'user',
        organizationId: 'org',
        role: 'CLIENT_MANAGER',
        buildingIds: ['a', 'b'],
      },
      'Où est la vanne ?',
      'a',
    );
    const query = prisma.projectFileKnowledgeChunk.findMany.mock.calls[0][0];
    expect(query.where.ingestion.buildingId).toBe('a');
    expect(query.where.ingestion.projectFile.AND).toContainEqual({
      building: { organizationId: 'org' },
    });
  });
});
