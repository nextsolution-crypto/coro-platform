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
    service = new ClientPortalService(prisma, {}, {}, {}, {}, {}, {}, {}, {});
  });

  afterAll(async () => {
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
});
