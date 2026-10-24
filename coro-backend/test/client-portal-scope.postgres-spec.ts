import {
  ClientUserRole,
  DocumentType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';

jest.mock('../src/export/export.service', () => ({
  ExportService: class ExportService {},
}));

const {
  ClientPortalService,
} = require('../src/client-portal/client-portal.service');
const { OccupancyService } = require('../src/occupancy/occupancy.service');

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL est obligatoire pour client-portal-scope.postgres-spec',
  );
}

describe('Client Portal project and building scope', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const suffix = randomUUID();
  const ids = {
    org: `cp002-org-${suffix}`,
    otherOrg: `cp002-other-org-${suffix}`,
    clientA: `cp002-client-a-${suffix}`,
    clientB: `cp002-client-b-${suffix}`,
    otherClient: `cp002-other-client-${suffix}`,
    buildingA: `cp002-building-a-${suffix}`,
    buildingB: `cp002-building-b-${suffix}`,
    otherBuilding: `cp002-other-building-${suffix}`,
    projectA: `cp002-project-a-${suffix}`,
    projectB: `cp002-project-b-${suffix}`,
    otherProject: `cp002-other-project-${suffix}`,
    user: `cp002-user-${suffix}`,
    otherUser: `cp002-other-user-${suffix}`,
    manager: `cp006-manager-${suffix}`,
    corporate: `cp006-corporate-${suffix}`,
    commentB: `cp006-comment-b-${suffix}`,
    clientComment: `cp007-client-comment-${suffix}`,
    versionB: `cp006-version-b-${suffix}`,
    engagementB: `cp006-engagement-b-${suffix}`,
  };
  let service: any;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: ids.org, name: 'CP-002 Organization', licenseType: 'ENTREPRISE' },
        {
          id: ids.otherOrg,
          name: 'CP-002 Other Organization',
          licenseType: 'ENTREPRISE',
        },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: ids.user,
          email: `cp002-${suffix}@example.invalid`,
          password: 'unused',
          firstName: 'Scope',
          lastName: 'Actor',
          role: UserRole.ADMIN,
          organizationId: ids.org,
        },
        {
          id: ids.otherUser,
          email: `cp002-other-${suffix}@example.invalid`,
          password: 'unused',
          firstName: 'Other',
          lastName: 'Actor',
          role: UserRole.ADMIN,
          organizationId: ids.otherOrg,
        },
      ],
    });
    await prisma.client.createMany({
      data: [
        {
          id: ids.clientA,
          name: 'Client A',
          organizationId: ids.org,
          regulatoryRequirements: [],
        },
        {
          id: ids.clientB,
          name: 'Client B',
          organizationId: ids.org,
          regulatoryRequirements: [],
        },
        {
          id: ids.otherClient,
          name: 'Other client',
          organizationId: ids.otherOrg,
          regulatoryRequirements: [],
        },
      ],
    });
    await prisma.building.createMany({
      data: [
        {
          id: ids.buildingA,
          name: 'Building A',
          address: '1 Test',
          city: 'Québec',
          province: 'QC',
          clientId: ids.clientA,
          organizationId: ids.org,
        },
        {
          id: ids.buildingB,
          name: 'Building B',
          address: '2 Test',
          city: 'Québec',
          province: 'QC',
          clientId: ids.clientB,
          organizationId: ids.org,
        },
        {
          id: ids.otherBuilding,
          name: 'Other building',
          address: '3 Test',
          city: 'Québec',
          province: 'QC',
          clientId: ids.otherClient,
          organizationId: ids.otherOrg,
        },
      ],
    });
    await prisma.project.createMany({
      data: [
        {
          id: ids.projectA,
          name: 'Project A',
          documentType: DocumentType.PMU,
          year: 2026,
          organizationId: ids.org,
          clientId: ids.clientA,
          buildingId: ids.buildingA,
          userId: ids.user,
        },
        {
          id: ids.projectB,
          name: 'Project B',
          documentType: DocumentType.PMU,
          year: 2026,
          organizationId: ids.org,
          clientId: ids.clientB,
          buildingId: ids.buildingB,
          userId: ids.user,
        },
        {
          id: ids.otherProject,
          name: 'Other project',
          documentType: DocumentType.PMU,
          year: 2026,
          organizationId: ids.otherOrg,
          clientId: ids.otherClient,
          buildingId: ids.otherBuilding,
          userId: ids.otherUser,
        },
      ],
    });
    await prisma.clientUser.createMany({
      data: [
        {
          id: ids.manager,
          email: `cp006-manager-${suffix}@example.invalid`,
          password: 'unused',
          firstName: 'Building',
          lastName: 'Manager',
          role: ClientUserRole.CLIENT_MANAGER,
          buildingIds: [ids.buildingA],
          clientId: ids.clientA,
          organizationId: ids.org,
        },
        {
          id: ids.corporate,
          email: `cp006-corporate-${suffix}@example.invalid`,
          password: 'unused',
          firstName: 'Corporate',
          lastName: 'Manager',
          role: ClientUserRole.CLIENT_CORPORATE,
          buildingIds: [],
          clientId: ids.clientA,
          organizationId: ids.org,
        },
      ],
    });
    await prisma.projectComment.create({
      data: {
        id: ids.commentB,
        projectId: ids.projectB,
        userId: ids.user,
        organizationId: ids.org,
        contenu: 'Protected client B comment',
      },
    });
    await prisma.projectVersion.create({
      data: {
        id: ids.versionB,
        projectId: ids.projectB,
        versionNumber: 1,
        label: 'Protected client B version',
        snapshot: {},
      },
    });
    await prisma.documentEngagement.create({
      data: {
        id: ids.engagementB,
        projectId: ids.projectB,
        clientUserId: ids.corporate,
        event: 'opened',
        device: 'desktop',
      },
    });
    service = new ClientPortalService(prisma, {}, {}, {}, {}, {}, {}, {}, {});
  });

  afterAll(async () => {
    await prisma.documentEngagement.deleteMany({
      where: { id: ids.engagementB },
    });
    await prisma.projectVersion.deleteMany({ where: { id: ids.versionB } });
    await prisma.projectComment.deleteMany({
      where: {
        OR: [
          { id: { in: [ids.commentB, ids.clientComment] } },
          { projectId: { in: [ids.projectA, ids.projectB, ids.otherProject] } },
        ],
      },
    });
    await prisma.clientUser.deleteMany({
      where: { id: { in: [ids.manager, ids.corporate] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [ids.projectA, ids.projectB, ids.otherProject] } },
    });
    await prisma.building.deleteMany({
      where: { id: { in: [ids.buildingA, ids.buildingB, ids.otherBuilding] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [ids.clientA, ids.clientB, ids.otherClient] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [ids.user, ids.otherUser] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [ids.org, ids.otherOrg] } },
    });
    await prisma.$disconnect();
  });

  it('persists typed ClientUser provenance and preserves internal-author history', async () => {
    const created = await service.addComment(
      ids.projectA,
      {
        sub: ids.manager,
        organizationId: ids.org,
        clientId: ids.clientA,
        role: ClientUserRole.CLIENT_MANAGER,
        buildingIds: [ids.buildingA],
      },
      'Typed client author',
    );
    await prisma.projectComment.update({
      where: { id: created.id },
      data: { id: ids.clientComment },
    });

    const [clientComment, historicalInternalComment] = await Promise.all([
      prisma.projectComment.findUniqueOrThrow({
        where: { id: ids.clientComment },
      }),
      prisma.projectComment.findUniqueOrThrow({ where: { id: ids.commentB } }),
    ]);
    expect(clientComment).toMatchObject({
      actorType: 'CLIENT_USER',
      clientUserId: ids.manager,
      userId: null,
    });
    expect(historicalInternalComment).toMatchObject({
      actorType: 'INTERNAL_USER',
      userId: ids.user,
      clientUserId: null,
    });

    await expect(
      prisma.projectComment.create({
        data: {
          projectId: ids.projectA,
          organizationId: ids.org,
          actorType: 'CLIENT_USER',
          userId: ids.user,
          clientUserId: ids.manager,
          contenu: 'Invalid mixed provenance',
        },
      }),
    ).rejects.toThrow();
  });

  it('applies refusal authorization before mutation and keeps legitimate retries idempotent', async () => {
    const emailService = { sendDocumentRefused: jest.fn() };
    const notificationsService = { create: jest.fn() };
    const refusalService = new ClientPortalService(
      prisma,
      {},
      {},
      emailService,
      {},
      notificationsService,
      {},
      {},
      {},
    );
    await prisma.project.update({
      where: { id: ids.projectA },
      data: { status: 'VALIDATED' },
    });
    const deniedBefore = await prisma.project.findUniqueOrThrow({
      where: { id: ids.projectA },
      select: { status: true },
    });

    await expect(
      refusalService.refuseDocument(
        ids.projectA,
        {
          sub: ids.manager,
          organizationId: ids.org,
          clientId: ids.clientA,
          role: ClientUserRole.CLIENT_MANAGER,
          buildingIds: [ids.buildingB],
        },
        'Out of scope',
      ),
    ).rejects.toThrow();
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: ids.projectA },
        select: { status: true },
      }),
    ).toEqual(deniedBefore);
    expect(
      await prisma.projectComment.count({
        where: { projectId: ids.projectA, contenu: { contains: 'Out of scope' } },
      }),
    ).toBe(0);
    expect(emailService.sendDocumentRefused).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();

    const actor = {
      sub: ids.manager,
      organizationId: ids.org,
      clientId: ids.clientA,
      role: ClientUserRole.CLIENT_MANAGER,
      buildingIds: [ids.buildingA],
    };
    await expect(
      refusalService.refuseDocument(ids.projectA, actor, 'Canonical refusal'),
    ).resolves.toEqual({ success: true, alreadyRefused: false });
    await expect(
      refusalService.refuseDocument(ids.projectA, actor, 'Canonical refusal'),
    ).resolves.toEqual({ success: true, alreadyRefused: true });

    expect(
      await prisma.projectComment.count({
        where: {
          projectId: ids.projectA,
          actorType: 'CLIENT_USER',
          clientUserId: ids.manager,
          contenu: '[Refus client] Canonical refusal',
        },
      }),
    ).toBe(1);
    expect(emailService.sendDocumentRefused).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
  });

  it('applies identical client and building scope to CLIENT_MANAGER list and direct reads', async () => {
    const list = await service.getProjects(
      ids.clientA,
      ids.org,
      ClientUserRole.CLIENT_MANAGER,
      [ids.buildingA, ids.buildingB],
    );
    expect(list.map((project: { id: string }) => project.id)).toEqual([
      ids.projectA,
    ]);
    await expect(
      service.getProject(
        ids.projectA,
        ids.clientA,
        ids.org,
        ClientUserRole.CLIENT_MANAGER,
        [ids.buildingA],
      ),
    ).resolves.toMatchObject({ id: ids.projectA });
    await expect(
      service.getProject(
        ids.projectB,
        ids.clientA,
        ids.org,
        ClientUserRole.CLIENT_MANAGER,
        [ids.buildingA, ids.buildingB],
      ),
    ).resolves.toBeNull();
  });

  it('scopes Intelligence counters and recommendations before aggregation', async () => {
    const intelligence = new OccupancyService(prisma);
    const managerOverview = await intelligence.getIntelligenceOverview({
      organizationId: ids.org,
      clientId: ids.clientA,
      role: ClientUserRole.CLIENT_MANAGER,
      buildingIds: [ids.buildingA],
    });
    expect(managerOverview.totalBuildings).toBe(1);
    expect(
      managerOverview.buildings.map((building: { buildingId: string }) =>
        building.buildingId,
      ),
    ).toEqual([ids.buildingA]);
    expect(managerOverview.recommendations).toEqual([]);

    const corporateOverview = await intelligence.getIntelligenceOverview({
      organizationId: ids.org,
      clientId: ids.clientA,
      role: ClientUserRole.CLIENT_CORPORATE,
      buildingIds: [],
    });
    expect(corporateOverview.totalBuildings).toBe(2);
    expect(
      corporateOverview.buildings
        .map((building: { buildingId: string }) => building.buildingId)
        .sort(),
    ).toEqual([ids.buildingA, ids.buildingB].sort());
    expect(
      corporateOverview.buildings.some(
        (building: { buildingId: string }) =>
          building.buildingId === ids.otherBuilding,
      ),
    ).toBe(false);
  });

  it('does not trust a known building id or a stale cross-client assignment', async () => {
    const buildings = await service.getBuildings(
      ids.clientA,
      ids.org,
      ClientUserRole.CLIENT_MANAGER,
      [ids.buildingA, ids.buildingB],
    );
    expect(buildings.map((building: { id: string }) => building.id)).toEqual([
      ids.buildingA,
    ]);
    await expect(
      service.assertBuildingAccess(ids.buildingB, {
        clientId: ids.clientA,
        organizationId: ids.org,
        role: ClientUserRole.CLIENT_MANAGER,
        buildingIds: [ids.buildingB],
      }),
    ).rejects.toThrow('Bâtiment introuvable');
  });

  it('preserves corporate organization scope without crossing organizations', async () => {
    const projects = await service.getProjects(
      ids.clientA,
      ids.org,
      ClientUserRole.CLIENT_CORPORATE,
      [],
    );
    expect(
      projects.map((project: { id: string }) => project.id).sort(),
    ).toEqual([ids.projectA, ids.projectB].sort());
    await expect(
      service.getProject(
        ids.projectB,
        ids.clientA,
        ids.org,
        ClientUserRole.CLIENT_CORPORATE,
        [],
      ),
    ).resolves.toMatchObject({ id: ids.projectB });
    await expect(
      service.getProject(
        ids.otherProject,
        ids.clientA,
        ids.org,
        ClientUserRole.CLIENT_CORPORATE,
        [],
      ),
    ).resolves.toBeNull();
  });

  it('denies annex metadata and writes for a manager outside client scope', async () => {
    const actor = {
      sub: ids.manager,
      email: `cp006-manager-${suffix}@example.invalid`,
      clientId: ids.clientA,
      organizationId: ids.org,
      role: ClientUserRole.CLIENT_MANAGER,
      buildingIds: [ids.buildingA, ids.buildingB],
    };
    const before = await prisma.documentEngagement.count({
      where: { projectId: ids.projectB },
    });

    await expect(service.getComments(ids.projectB, actor)).rejects.toThrow(
      'Projet introuvable',
    );
    await expect(
      service.getProjectVersionHistory(ids.projectB, actor),
    ).rejects.toThrow('Projet introuvable');
    await expect(service.getEngagement(ids.projectB, actor)).rejects.toThrow(
      'Projet introuvable',
    );
    await expect(
      service.trackEngagement(
        {
          projectId: ids.projectB,
          clientUserId: ids.manager,
          event: 'downloaded',
        },
        actor,
      ),
    ).rejects.toThrow('Projet introuvable');

    await expect(
      prisma.documentEngagement.count({ where: { projectId: ids.projectB } }),
    ).resolves.toBe(before);
  });

  it('allows corporate annex reads across clients in the same organization', async () => {
    const actor = {
      sub: ids.corporate,
      clientId: ids.clientA,
      organizationId: ids.org,
      role: ClientUserRole.CLIENT_CORPORATE,
      buildingIds: [],
    };

    await expect(service.getComments(ids.projectB, actor)).resolves.toEqual([
      expect.objectContaining({ id: ids.commentB }),
    ]);
    await expect(
      service.getProjectVersionHistory(ids.projectB, actor),
    ).resolves.toEqual([
      expect.objectContaining({ versionNumber: 1 }),
    ]);
    await expect(service.getEngagement(ids.projectB, actor)).resolves.toEqual(
      expect.objectContaining({ totalOpens: 1 }),
    );
  });
});
