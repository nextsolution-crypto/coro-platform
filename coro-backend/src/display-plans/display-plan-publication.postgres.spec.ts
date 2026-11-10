import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DisplayPermission, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpatialAuthorizationService } from '../spatial/spatial-authorization.service';
import type { StorageService } from '../storage/storage.service';
import { DisplayPlanPublicationService } from './display-plan-publication.service';
import { DisplayPlanRendererService } from './display-plan-renderer.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

describePostgres('DISPLAY-03 publication governance on PostgreSQL', () => {
  const prisma = new PrismaService();
  const objects = new Map<string, Buffer>();
  const storage = {
    downloadPrivate: jest.fn((key: string) => {
      const bytes = objects.get(key);
      if (!bytes) return Promise.reject(new Error('PRIVATE_OBJECT_NOT_FOUND'));
      return Promise.resolve(bytes);
    }),
    uploadPrivateImmutable: jest.fn((bytes: Buffer, key: string) => {
      if (objects.has(key))
        return Promise.reject(new Error('PRIVATE_OBJECT_ALREADY_EXISTS'));
      objects.set(key, Buffer.from(bytes));
      return Promise.resolve({ storageKey: key });
    }),
  } as unknown as StorageService;
  const service = new DisplayPlanPublicationService(
    prisma,
    storage,
    new SpatialAuthorizationService(prisma),
    new AdminAuditService(),
    new DisplayPlanRendererService(),
  );
  const ids: string[] = [];

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('publishes only the exact approved source and governed location, then revokes immediately', async () => {
    const suffix = randomUUID();
    const org = await prisma.organization.create({
      data: { name: `Display 03 ${suffix}` },
    });
    ids.push(org.id);
    const client = await prisma.client.create({
      data: { name: 'Client QA', organizationId: org.id },
    });
    const building = await prisma.building.create({
      data: {
        name: 'Tour QA',
        address: '1 QA',
        city: 'Montréal',
        province: 'QC',
        organizationId: org.id,
        clientId: client.id,
      },
    });
    const foreignBuilding = await prisma.building.create({
      data: {
        name: 'Autre QA',
        address: '2 QA',
        city: 'Montréal',
        province: 'QC',
        organizationId: org.id,
        clientId: client.id,
      },
    });
    const floor = await prisma.buildingFloor.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        code: 'RDC',
        name: 'Rez-de-chaussée',
      },
    });
    const otherFloor = await prisma.buildingFloor.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        code: 'ETAGE-2',
        name: 'Etage 2',
      },
    });
    const location = await prisma.displayLocation.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        floorId: floor.id,
        code: 'HALL',
        label: 'Hall',
        youAreHereX: 0.25,
        youAreHereY: 0.75,
        orientationDegrees: 90,
      },
    });

    const mkUser = (name: string, permissions: DisplayPermission[]) =>
      prisma.user.create({
        data: {
          email: `${name}-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: name,
          lastName: 'QA',
          role: UserRole.OPERATOR,
          organizationId: org.id,
          displayPermissions: permissions,
          displayBuildingIds: [building.id],
        },
      });
    const author = await mkUser('author', [
      DisplayPermission.DISPLAY_PLAN_CREATE,
      DisplayPermission.DISPLAY_PLAN_READ,
      DisplayPermission.DISPLAY_PLAN_REVIEW,
    ]);
    const reviewer = await mkUser('reviewer', [
      DisplayPermission.DISPLAY_PLAN_REVIEW,
      DisplayPermission.DISPLAY_PLAN_APPROVE,
    ]);
    const approver = await mkUser('approver', [
      DisplayPermission.DISPLAY_PLAN_APPROVE,
    ]);
    const publisher = await mkUser('publisher', [
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
      DisplayPermission.DISPLAY_PLAN_READ,
      DisplayPermission.DISPLAY_AUDIT_READ,
    ]);
    const revoker = await mkUser('revoker', [
      DisplayPermission.DISPLAY_PLAN_REVOKE,
    ]);
    const adminWithoutDisplayRights = await prisma.user.create({
      data: {
        email: `admin-${suffix}@example.invalid`,
        password: 'not-used',
        firstName: 'admin',
        lastName: 'QA',
        role: UserRole.ADMIN,
        organizationId: org.id,
      },
    });
    const superAdminWithoutDisplayRights = await prisma.user.create({
      data: {
        email: `super-admin-${suffix}@example.invalid`,
        password: 'not-used',
        firstName: 'super-admin',
        lastName: 'QA',
        role: UserRole.SUPER_ADMIN,
        organizationId: org.id,
      },
    });
    const sourceBytes = Buffer.alloc(24);
    sourceBytes.writeUInt8(0x89, 0);
    sourceBytes.write('PNG', 1, 'ascii');
    sourceBytes.writeUInt32BE(2200, 16);
    sourceBytes.writeUInt32BE(1700, 20);
    const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
    objects.set('display03/source.png', sourceBytes);
    const source = await prisma.projectFile.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        name: 'Plan évacuation QA',
        category: 'plans_evacuation',
        size: sourceBytes.length,
        mimeType: 'image/png',
        storageKey: 'display03/source.png',
        url: 'private:project-file',
        version: 1,
        visibility: 'internal',
        status: 'valide',
        lifecycleState: 'APPROVED',
        sha256: sourceHash,
        approvedAt: new Date(),
        approvedById: approver.id,
        effectiveAt: new Date(),
      },
    });

    const actor = (user: typeof author) => ({
      userId: user.id,
      organizationId: org.id,
      role: user.role,
    });
    const draftInput = {
      locationId: location.id,
      projectFileId: source.id,
      sourceVersion: 1,
      orientation: 'LANDSCAPE' as const,
      language: 'FR' as const,
    };
    await expect(
      service.createDraft(
        org.id,
        building.id,
        {
          ...draftInput,
          floorId: floor.id,
          requestId: `admin-without-rights-${suffix}`,
        },
        actor(adminWithoutDisplayRights),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.createDraft(
        org.id,
        building.id,
        {
          ...draftInput,
          floorId: floor.id,
          requestId: `super-admin-without-rights-${suffix}`,
        },
        actor(superAdminWithoutDisplayRights),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.createDraft(
        org.id,
        building.id,
        {
          ...draftInput,
          floorId: otherFloor.id,
          requestId: `contradictory-floor-${suffix}`,
        },
        actor(author),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createDraft(
        'foreign-organization',
        building.id,
        {
          ...draftInput,
          floorId: floor.id,
          requestId: `foreign-organization-${suffix}`,
        },
        actor(author),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const draft = await service.createDraft(
      org.id,
      building.id,
      {
        ...draftInput,
        floorId: floor.id,
        requestId: `create-${suffix}`,
      },
      actor(author),
    );
    await expect(
      service.get(org.id, foreignBuilding.id, draft.id, actor(author)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const rendered = await service.generatePreview(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: draft.lockVersion,
        reason: 'Génération contrôlée QA',
        requestId: `render-${suffix}`,
      },
      actor(author),
    );
    expect(rendered.variantSha256).toMatch(/^[a-f0-9]{64}$/);
    const submitted = await service.submit(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: rendered.lockVersion,
        reason: 'Soumission en revue QA',
        requestId: `submit-${suffix}`,
      },
      actor(author),
    );
    await expect(
      service.markReviewed(
        org.id,
        building.id,
        draft.id,
        {
          expectedLockVersion: submitted.lockVersion,
          reason: 'Auto revue interdite QA',
          requestId: `self-${suffix}`,
        },
        actor(author),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const reviewed = await service.markReviewed(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: submitted.lockVersion,
        reason: 'Revue indépendante QA',
        requestId: `review-${suffix}`,
      },
      actor(reviewer),
    );
    await expect(
      service.approve(
        org.id,
        building.id,
        draft.id,
        {
          expectedLockVersion: reviewed.lockVersion,
          reason: 'Réviseur approbateur interdit QA',
          requestId: `reviewer-approve-${suffix}`,
          sourceVersion: reviewed.sourceVersion,
          sourceSha256: reviewed.sourceSha256,
          variantVersion: reviewed.variantVersion,
          variantSha256: reviewed.variantSha256!,
          profile: 'SOURCE_NATIVE',
          locationId: reviewed.locationId,
        },
        actor(reviewer),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const approved = await service.approve(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: reviewed.lockVersion,
        reason: 'Approbation indépendante QA',
        requestId: `approve-${suffix}`,
        sourceVersion: reviewed.sourceVersion,
        sourceSha256: reviewed.sourceSha256,
        variantVersion: reviewed.variantVersion,
        variantSha256: reviewed.variantSha256!,
        profile: 'SOURCE_NATIVE',
        locationId: reviewed.locationId,
      },
      actor(approver),
    );
    const approvalEvent = await prisma.displayPlanPublicationEvent.findUnique({
      where: {
        publicationId_requestId: {
          publicationId: draft.id,
          requestId: `approve-${suffix}`,
        },
      },
    });
    expect(approvalEvent?.metadata).toMatchObject({
      visualAcceptance: {
        status: 'APPROVED',
        sourceSha256: reviewed.sourceSha256,
        variantSha256: reviewed.variantSha256,
        profile: 'SOURCE_NATIVE',
        locationId: reviewed.locationId,
      },
    });
    const published = await service.publish(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: approved.lockVersion,
        reason: 'Publication contrôlée QA',
        requestId: `publish-${suffix}`,
      },
      actor(publisher),
    );
    expect(published.status).toBe('PUBLISHED');
    const contract = await service.playerContract(
      org.id,
      building.id,
      location.id,
      actor(publisher),
    );
    expect(contract).toMatchObject({
      publicationId: draft.id,
      status: 'PUBLISHED',
      documentVersion: 1,
      sourceSha256: sourceHash,
      variantSha256: rendered.variantSha256,
      locationId: location.id,
    });
    const playerBytes = await service.downloadPlayerVariant(
      org.id,
      building.id,
      location.id,
      draft.id,
      actor(publisher),
    );
    expect(playerBytes.sha256).toBe(rendered.variantSha256);
    const suspended = await service.suspend(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: published.lockVersion,
        reason: 'Suspension QA',
        requestId: `suspend-${suffix}`,
      },
      actor(publisher),
    );
    await expect(
      service.playerContract(
        org.id,
        building.id,
        location.id,
        actor(publisher),
      ),
    ).rejects.toThrow('Aucune publication active');
    const resumed = await service.resume(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: suspended.lockVersion,
        reason: 'Reprise QA',
        requestId: `resume-${suffix}`,
      },
      actor(publisher),
    );
    const history = await service.history(
      org.id,
      building.id,
      draft.id,
      actor(publisher),
    );
    expect(history.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        'CREATED',
        'PREVIEW_GENERATED',
        'SUBMITTED',
        'REVIEWED',
        'APPROVED',
        'PUBLISHED',
      ]),
    );
    const revoked = await service.revoke(
      org.id,
      building.id,
      draft.id,
      {
        expectedLockVersion: resumed.lockVersion,
        reason: 'Révocation immédiate QA',
        requestId: `revoke-${suffix}`,
      },
      actor(revoker),
    );
    expect(revoked.status).toBe('REVOKED');
    await expect(
      service.playerContract(
        org.id,
        building.id,
        location.id,
        actor(publisher),
      ),
    ).rejects.toThrow('Aucune publication active');
    await expect(
      service.downloadPlayerVariant(
        org.id,
        building.id,
        location.id,
        draft.id,
        actor(publisher),
      ),
    ).rejects.toThrow('Aucune publication active');
    expect(
      await prisma.adminAuditEvent.count({
        where: { organizationId: org.id, targetId: draft.id },
      }),
    ).toBeGreaterThanOrEqual(6);
  }, 30_000);
});
