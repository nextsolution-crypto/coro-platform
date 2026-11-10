import { DisplayPermission, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { DisplayManagerService } from '../src/display-plans/display-manager.service';
import { PrismaService } from '../src/prisma/prisma.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

describePostgres('DISPLAY-05A manager tenant and permission isolation', () => {
  const prisma = new PrismaService();
  const service = new DisplayManagerService(prisma);
  const suffix = randomUUID();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  const user = (
    organizationId: string,
    role: UserRole,
    permissions: DisplayPermission[],
    buildingIds: string[],
    label: string = randomUUID(),
  ) =>
    prisma.user.create({
      data: {
        email: `display-review-${label}-${suffix}@example.invalid`,
        password: 'not-used',
        firstName: 'Display',
        lastName: 'Review',
        role,
        organizationId,
        displayPermissions: permissions,
        displayBuildingIds: buildingIds,
      },
    });

  it('enforces DISPLAY_READ, building assignment and tenant boundaries in PostgreSQL', async () => {
    const [orgA, orgB] = await Promise.all([
      prisma.organization.create({
        data: { name: `Display review A ${suffix}` },
      }),
      prisma.organization.create({
        data: { name: `Display review B ${suffix}` },
      }),
    ]);
    const [clientA, clientB] = await Promise.all([
      prisma.client.create({
        data: { name: 'Client A', organizationId: orgA.id },
      }),
      prisma.client.create({
        data: { name: 'Client B', organizationId: orgB.id },
      }),
    ]);
    const [buildingA1, buildingA2, buildingB] = await Promise.all([
      prisma.building.create({
        data: {
          name: 'A1',
          address: '1 A',
          city: 'Montréal',
          province: 'QC',
          organizationId: orgA.id,
          clientId: clientA.id,
        },
      }),
      prisma.building.create({
        data: {
          name: 'A2',
          address: '2 A',
          city: 'Montréal',
          province: 'QC',
          organizationId: orgA.id,
          clientId: clientA.id,
        },
      }),
      prisma.building.create({
        data: {
          name: 'B1',
          address: '1 B',
          city: 'Québec',
          province: 'QC',
          organizationId: orgB.id,
          clientId: clientB.id,
        },
      }),
    ]);
    const floorA1 = await prisma.buildingFloor.create({
      data: {
        organizationId: orgA.id,
        buildingId: buildingA1.id,
        code: 'RDC',
        name: 'RDC',
      },
    });
    const locationA1 = await prisma.displayLocation.create({
      data: {
        organizationId: orgA.id,
        buildingId: buildingA1.id,
        floorId: floorA1.id,
        code: 'HALL',
        label: 'Hall',
        youAreHereX: 0.25,
        youAreHereY: 0.5,
        orientationDegrees: 0,
      },
    });
    const authorized = await user(
      orgA.id,
      UserRole.OPERATOR,
      [
        DisplayPermission.DISPLAY_READ,
        DisplayPermission.DISPLAY_PLAN_READ,
        DisplayPermission.DISPLAY_AUDIT_READ,
        DisplayPermission.DISPLAY_PLAN_CREATE,
      ],
      [buildingA1.id],
      'authorized',
    );
    const creator = await user(
      orgA.id,
      UserRole.OPERATOR,
      [DisplayPermission.DISPLAY_PLAN_CREATE],
      [buildingA1.id],
      'creator',
    );
    const source = await prisma.projectFile.create({
      data: {
        organizationId: orgA.id,
        buildingId: buildingA1.id,
        name: 'Plan approuvé.pdf',
        category: 'plans_evacuation',
        size: 1024,
        mimeType: 'application/pdf',
        storageKey: `tenant-${orgA.id}/source.pdf`,
        url: 'private://source.pdf',
        lifecycleState: 'APPROVED',
        status: 'valide',
        sha256: 'a'.repeat(64),
        approvedAt: new Date(),
        approvedById: creator.id,
        effectiveAt: new Date(Date.now() - 1_000),
      },
    });
    const publication = await prisma.displayPlanPublication.create({
      data: {
        organizationId: orgA.id,
        buildingId: buildingA1.id,
        floorId: floorA1.id,
        locationId: locationA1.id,
        projectFileId: source.id,
        creationRequestId: randomUUID(),
        sourceVersion: source.version,
        sourceSha256: source.sha256!,
        sourceApprovedById: creator.id,
        sourceApprovedAt: new Date(),
        versionNumber: 1,
        orientation: 'LANDSCAPE',
        language: 'FR',
        renderParameters: {},
        createdById: creator.id,
      },
    });
    await prisma.displayPlanPublicationEvent.create({
      data: {
        publicationId: publication.id,
        organizationId: orgA.id,
        buildingId: buildingA1.id,
        requestId: randomUUID(),
        action: 'CREATED',
        toStatus: 'DRAFT',
        actorUserId: creator.id,
        sourceVersion: 1,
        sourceSha256: source.sha256!,
        variantVersion: 0,
      },
    });

    const workspace = await service.getWorkspace(orgA.id, {
      userId: authorized.id,
      organizationId: orgA.id,
      role: authorized.role,
    });
    expect(workspace.buildings.map((item) => item.id)).toEqual([buildingA1.id]);
    expect(workspace.plans.map((item) => item.id)).toEqual([publication.id]);
    expect(workspace.eligiblePdfSources.map((item) => item.id)).toEqual([
      source.id,
    ]);
    expect(workspace.recentEvents).toHaveLength(1);
    expect(JSON.stringify(workspace)).not.toContain(buildingA2.id);
    expect(JSON.stringify(workspace)).not.toContain(buildingB.id);

    for (const [role, label] of [
      [UserRole.ADMIN, 'admin'],
      [UserRole.SUPER_ADMIN, 'super'],
    ] as const) {
      const withoutDisplay = await user(
        orgA.id,
        role,
        [],
        [buildingA1.id],
        label,
      );
      await expect(
        service.getWorkspace(orgA.id, {
          userId: withoutDisplay.id,
          organizationId: orgA.id,
          role,
        }),
      ).rejects.toThrow('DISPLAY_READ');
    }
    const emptyAssignment = await user(
      orgA.id,
      UserRole.OPERATOR,
      [DisplayPermission.DISPLAY_READ],
      [],
      'empty',
    );
    await expect(
      service.getWorkspace(orgA.id, {
        userId: emptyAssignment.id,
        organizationId: orgA.id,
        role: emptyAssignment.role,
      }),
    ).rejects.toThrow('affectation');
    const contentOnly = await user(
      orgA.id,
      UserRole.OPERATOR,
      [DisplayPermission.DISPLAY_CONTENT_MANAGE],
      [buildingA1.id],
      'content',
    );
    await expect(
      service.getWorkspace(orgA.id, {
        userId: contentOnly.id,
        organizationId: orgA.id,
        role: contentOnly.role,
      }),
    ).rejects.toThrow('DISPLAY_READ');
    await expect(
      service.getWorkspace(orgB.id, {
        userId: authorized.id,
        organizationId: orgA.id,
        role: authorized.role,
      }),
    ).rejects.toThrow('interdit');
  });

  it('supports multiple assigned buildings while withholding capability-specific data', async () => {
    const org = await prisma.organization.create({
      data: { name: `Display review multi ${suffix}` },
    });
    const client = await prisma.client.create({
      data: { name: 'Client multi', organizationId: org.id },
    });
    const buildings = await Promise.all(
      ['M1', 'M2'].map((name, index) =>
        prisma.building.create({
          data: {
            name,
            address: `${index} M`,
            city: 'Laval',
            province: 'QC',
            organizationId: org.id,
            clientId: client.id,
          },
        }),
      ),
    );
    const reader = await user(
      org.id,
      UserRole.OPERATOR,
      [DisplayPermission.DISPLAY_READ],
      buildings.map((item) => item.id),
      'reader',
    );
    const workspace = await service.getWorkspace(org.id, {
      userId: reader.id,
      organizationId: org.id,
      role: reader.role,
    });
    expect(workspace.buildings).toHaveLength(2);
    expect(workspace.plans).toEqual([]);
    expect(workspace.eligiblePdfSources).toEqual([]);
    expect(workspace.recentEvents).toEqual([]);
  });
});
