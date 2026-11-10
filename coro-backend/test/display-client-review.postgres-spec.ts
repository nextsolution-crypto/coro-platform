import { createHash, randomUUID } from 'node:crypto';
import { DisplayPermission, UserRole } from '@prisma/client';
import {
  ClientDisplayService,
  type ClientDisplayActor,
} from '../src/client-portal/client-display.service';
import { PrismaService } from '../src/prisma/prisma.service';
import type { StorageService } from '../src/storage/storage.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

describePostgres('DISPLAY-05B client portal security on PostgreSQL 16', () => {
  const prisma = new PrismaService();
  const previewBytes = Buffer.from('private-display-preview');
  const service = new ClientDisplayService(prisma, {
    downloadPrivate: jest.fn().mockResolvedValue(previewBytes),
  } as unknown as StorageService);

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('isolates three tenants, deduplicates concurrency and preserves immutable evidence', async () => {
    const suffix = randomUUID();
    const organizations = await Promise.all(
      ['A', 'B', 'C'].map((label) =>
        prisma.organization.create({
          data: { name: `Display client ${label} ${suffix}` },
        }),
      ),
    );
    const clients = await Promise.all(
      organizations.map((organization, index) =>
        prisma.client.create({
          data: { name: `Client ${index}`, organizationId: organization.id },
        }),
      ),
    );
    const buildings = await Promise.all(
      organizations.map((organization, index) =>
        prisma.building.create({
          data: {
            name: `Bâtiment ${index}`,
            address: `${index} rue QA`,
            city: 'Montréal',
            province: 'QC',
            organizationId: organization.id,
            clientId: clients[index].id,
          },
        }),
      ),
    );
    const creator = await prisma.user.create({
      data: {
        email: `display-creator-${suffix}@example.invalid`,
        password: 'not-used',
        firstName: 'Display',
        lastName: 'Creator',
        role: UserRole.OPERATOR,
        organizationId: organizations[0].id,
      },
    });
    const floor = await prisma.buildingFloor.create({
      data: {
        organizationId: organizations[0].id,
        buildingId: buildings[0].id,
        code: 'RDC',
        name: 'RDC',
      },
    });
    const location = await prisma.displayLocation.create({
      data: {
        organizationId: organizations[0].id,
        buildingId: buildings[0].id,
        floorId: floor.id,
        code: 'HALL',
        label: 'Hall',
      },
    });
    const source = await prisma.projectFile.create({
      data: {
        organizationId: organizations[0].id,
        buildingId: buildings[0].id,
        name: 'Plan client approuvé.pdf',
        category: 'plans_evacuation',
        size: 1024,
        mimeType: 'application/pdf',
        storageKey: `qa/${suffix}/source.pdf`,
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
        organizationId: organizations[0].id,
        buildingId: buildings[0].id,
        floorId: floor.id,
        locationId: location.id,
        projectFileId: source.id,
        creationRequestId: randomUUID(),
        sourceVersion: source.version,
        sourceSha256: source.sha256!,
        sourceApprovedById: creator.id,
        sourceApprovedAt: source.approvedAt!,
        versionNumber: 1,
        variantVersion: 1,
        variantStorageKey: `qa/${suffix}/preview.png`,
        variantSha256: createHash('sha256').update(previewBytes).digest('hex'),
        variantMimeType: 'image/png',
        orientation: 'LANDSCAPE',
        language: 'FR',
        renderParameters: {},
        status: 'APPROVED',
        createdById: creator.id,
        approvedById: creator.id,
        approvedAt: new Date(),
      },
    });
    const makeClientUser = (index: number, label: string) =>
      prisma.clientUser.create({
        data: {
          email: `display-client-${label}-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Client',
          lastName: label,
          organizationId: organizations[index].id,
          clientId: clients[index].id,
          buildingIds: [buildings[index].id],
          displayBuildingIds: [buildings[index].id],
          displayPermissions: [
            DisplayPermission.DISPLAY_CLIENT_PLAN_READ,
            DisplayPermission.DISPLAY_CLIENT_PREVIEW,
            DisplayPermission.DISPLAY_CLIENT_LOCATION_READ,
            DisplayPermission.DISPLAY_CLIENT_OBSERVATION_SUBMIT,
            DisplayPermission.DISPLAY_CLIENT_OBSERVATION_READ,
          ],
        },
      });
    const [author, sameTenantPeer, foreignUser] = await Promise.all([
      makeClientUser(0, 'author'),
      makeClientUser(0, 'peer'),
      makeClientUser(1, 'foreign'),
    ]);
    const actor = (user: typeof author, index: number): ClientDisplayActor => ({
      sub: user.id,
      organizationId: organizations[index].id,
      clientId: clients[index].id,
      buildingIds: user.buildingIds,
      displayBuildingIds: user.displayBuildingIds,
      displayPermissions: user.displayPermissions,
    });

    const workspace = await service.workspace(actor(author, 0), {
      limit: 25,
      offset: 0,
    });
    expect(workspace.plans.map((plan) => plan.id)).toEqual([publication.id]);
    expect(JSON.stringify(workspace)).not.toContain(buildings[1].id);
    await expect(
      service.preview(actor(foreignUser, 1), publication.id),
    ).rejects.toThrow();

    const requestId = randomUUID();
    const input = {
      requestId,
      buildingId: buildings[0].id,
      publicationId: publication.id,
      locationId: location.id,
      category: 'OTHER' as const,
      suggestedPriority: 'CRITICAL' as const,
      description: 'Sortie possiblement obstruée, validation humaine requise.',
      normalizedX: 0.25,
      normalizedY: 0.75,
    };
    const results = await Promise.all([
      service.submit(actor(author, 0), input),
      service.submit(actor(author, 0), input),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(
      await prisma.displayCorrectionObservation.count({
        where: { submissionRequestId: requestId },
      }),
    ).toBe(1);
    expect(
      await prisma.displayCorrectionObservationEvent.count({
        where: { observationId: results[0].id },
      }),
    ).toBe(1);

    const authorPage = await service.observations(actor(author, 0), {
      limit: 10,
      offset: 0,
    });
    const peerPage = await service.observations(actor(sameTenantPeer, 0), {
      limit: 10,
      offset: 0,
    });
    expect(authorPage.total).toBe(1);
    expect(peerPage.total).toBe(0);

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "DisplayCorrectionObservation" SET "variantSha256" = '${'b'.repeat(64)}' WHERE "id" = '${results[0].id}'`,
      ),
    ).rejects.toThrow('DISPLAY_OBSERVATION_IDENTITY_IMMUTABLE');
    await prisma.displayCorrectionObservation.update({
      where: { id: results[0].id },
      data: { status: 'UNDER_REVIEW', lockVersion: { increment: 1 } },
    });
    await expect(
      prisma.displayCorrectionObservation.delete({
        where: { id: results[0].id },
      }),
    ).rejects.toThrow('DISPLAY_OBSERVATION_APPEND_ONLY');
    await expect(
      prisma.displayCorrectionObservationEvent.deleteMany({
        where: { observationId: results[0].id },
      }),
    ).rejects.toThrow('DISPLAY_OBSERVATION_APPEND_ONLY');

    const unchanged = await prisma.displayPlanPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(unchanged.status).toBe('APPROVED');
    expect(unchanged.variantSha256).toBe(publication.variantSha256);
    expect(
      (await prisma.projectFile.findUniqueOrThrow({ where: { id: source.id } }))
        .sha256,
    ).toBe(source.sha256);
  });
});
