import {
  BuildingDocumentsService,
  documentMime,
  isIndexable,
} from './building-documents.service';
import { KnowledgeActor } from '../knowledge/knowledge.types';
const internal: KnowledgeActor = {
  type: 'INTERNAL_USER',
  id: 'advisor',
  organizationId: 'org',
  role: 'OPERATOR',
};
const client: KnowledgeActor = {
  type: 'CLIENT_USER',
  id: 'client-user',
  organizationId: 'org',
  role: 'CLIENT_MANAGER',
  buildingIds: [],
};
function harness() {
  const prisma: any = {
    building: {
      findFirst: jest.fn(async () => ({
        id: 'building',
        name: 'Bâtiment',
        clientId: 'client',
        responsableEmail: 'manager@example.invalid',
        client: { isActive: true },
      })),
    },
    user: {
      findFirst: jest.fn(async () => ({ id: 'advisor', role: 'OPERATOR' })),
    },
    clientUser: {
      findFirst: jest.fn(async () => ({
        clientId: 'client',
        role: 'CLIENT_MANAGER',
        buildingIds: ['building'],
        email: 'manager@example.invalid',
      })),
      findMany: jest.fn(async () => []),
    },
    buildingDocumentGrant: {
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      upsert: jest.fn(async ({ create }: any) => create),
    },
    customerPortfolioAssignment: { findMany: jest.fn(async () => []) },
    customerPortfolioBuildingMembership: {
      findFirst: jest.fn(async () => null),
    },
    projectFile: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => ({ id: 'file' })),
    },
    auditLog: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (fn) => fn(prisma));
  const files: any = {
    uploadFile: jest.fn(async (data) => data),
    downloadPrivateFile: jest.fn(async () => ({
      buffer: Buffer.from('x'),
      mimeType: 'text/plain',
      name: 'x.txt',
    })),
  };
  return {
    prisma,
    files,
    service: new BuildingDocumentsService(prisma, files),
  };
}
describe('Building document durable authority and live permissions', () => {
  it('allows active internal advisers to deposit without a project', async () => {
    const h = harness();
    const result = await h.service.upload(
      internal,
      'building',
      { originalname: 'plan.pdf', buffer: Buffer.from('%PDF-') } as any,
      {},
    );
    expect(result).toMatchObject({
      buildingId: 'building',
      uploadedById: 'advisor',
    });
    expect(result.projectId).toBeUndefined();
  });
  it('gives corporate organization-wide read while keeping contribution scoped', async () => {
    const h = harness();
    expect((await h.service.access(client, 'building')).canUpload).toBe(true);
    h.prisma.clientUser.findFirst.mockResolvedValue({
      clientId: 'other-client',
      role: 'CLIENT_CORPORATE',
      buildingIds: [],
      email: 'x',
    });
    const crossClient = await h.service.access(
      { ...client, role: 'CLIENT_CORPORATE' },
      'building',
    );
    expect(crossClient.canUpload).toBe(false);
    expect(crossClient.canManage).toBe(false);
  });
  it('ignores stale token scope and permits explicit delegation without management rights', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({
      clientId: 'client',
      role: 'CLIENT_MANAGER',
      buildingIds: [],
      email: 'x',
    });
    await expect(
      h.service.access({ ...client, buildingIds: ['building'] }, 'building'),
    ).rejects.toThrow('non accordé');
    h.prisma.buildingDocumentGrant.findUnique.mockResolvedValue({
      canUpload: true,
    });
    expect((await h.service.access(client, 'building')).canUpload).toBe(true);
    expect((await h.service.access(client, 'building')).canManage).toBe(false);
  });
  it('honours explicit suspension while retaining responsible user access', async () => {
    const h = harness();
    h.prisma.buildingDocumentGrant.findUnique.mockResolvedValue({
      canUpload: false,
    });
    expect((await h.service.access(client, 'building')).canUpload).toBe(false);
    await expect(
      h.service.upload(
        client,
        'building',
        { buffer: Buffer.from('x') } as any,
        {},
      ),
    ).rejects.toThrow('non autorisé');
  });
  it('includes live regional supervisors', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({
      clientId: 'client',
      role: 'CLIENT_MANAGER',
      buildingIds: [],
      email: 'x',
    });
    h.prisma.customerPortfolioAssignment.findMany.mockResolvedValue([
      { scope: 'REGION', regionId: 'region' },
    ]);
    h.prisma.customerPortfolioBuildingMembership.findFirst.mockResolvedValue({
      id: 'membership',
    });
    expect((await h.service.access(client, 'building')).canManage).toBe(true);
  });
  it('forces shared visibility and records client authorship', async () => {
    const h = harness();
    const r = await h.service.upload(
      client,
      'building',
      { originalname: 'data.XLSX', buffer: Buffer.from('zip') } as any,
      { visibility: 'internal' },
    );
    expect(r).toMatchObject({
      visibility: 'shared',
      uploadedByClientId: 'client-user',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });
  it('filters project working files and private storage keys', async () => {
    const h = harness();
    await h.service.list(client, 'building');
    const query = h.prisma.projectFile.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({
      organizationId: 'org',
      visibility: 'shared',
    });
    expect(query.where.AND[0].OR).toEqual([
      { projectId: null },
      { approvedAt: { not: null } },
    ]);
    expect(query.select.storageKey).toBeUndefined();
    expect(query.select.url).toBeUndefined();
  });
  it('authorizes exact building and shared visibility before downloading', async () => {
    const h = harness();
    await h.service.content(client, 'building', 'file');
    expect(h.prisma.projectFile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'file',
          organizationId: 'org',
          OR: [
            { buildingId: 'building' },
            { buildingId: null, project: { buildingId: 'building', organizationId: 'org' } },
          ],
          visibility: 'shared',
        },
      }),
    );
    expect(h.files.downloadPrivateFile).toHaveBeenCalledWith(
      'file',
      'org',
      ['building'],
      true,
    );
  });
  it('records permission changes transactionally', async () => {
    const h = harness();
    await h.service.setGrant(client, 'building', 'recipient', true);
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientUserId: 'client-user',
          action: 'BUILDING_DOCUMENT_PERMISSION_CHANGED',
        }),
      }),
    );
  });
  it('rejects inactive identities and unsupported executables', async () => {
    const h = harness();
    h.prisma.user.findFirst.mockResolvedValue(null);
    await expect(h.service.access(internal, 'building')).rejects.toThrow(
      'inactif',
    );
    expect(() => documentMime('run.exe')).toThrow();
    expect(isIndexable(documentMime('plan.dwg'))).toBe(false);
  });
});
