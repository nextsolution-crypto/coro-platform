import { DisplayPermission, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SpatialAuthorizationService } from '../src/spatial/spatial-authorization.service';
import type { StorageService } from '../src/storage/storage.service';
import { DisplayPdfRenderJobService } from '../src/display-plans/display-pdf-render-job.service';
import { DisplayPlanPublicationService } from '../src/display-plans/display-plan-publication.service';
import { DisplayPlanRendererService } from '../src/display-plans/display-plan-renderer.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres(
  'DISPLAY-09 real PDF V1/V2 publication proof on PostgreSQL',
  () => {
    const prisma = databaseUrl
      ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
      : new PrismaService();
    const objects = new Map<string, Buffer>();
    const storage = {
      downloadPrivate: jest.fn(async (key: string) => {
        const bytes = objects.get(key);
        if (!bytes) throw new Error('PRIVATE_OBJECT_NOT_FOUND');
        return Buffer.from(bytes);
      }),
      uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
        if (objects.has(key)) throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
        objects.set(key, Buffer.from(bytes));
        return { storageKey: key };
      }),
    } as unknown as StorageService;
    const authorization = new SpatialAuthorizationService(prisma);
    const renderer = new DisplayPlanRendererService();
    const publications = new DisplayPlanPublicationService(
      prisma,
      storage,
      authorization,
      new AdminAuditService(),
      renderer,
    );
    const raster = Buffer.alloc(24);
    raster.writeUInt8(0x89, 0);
    raster.write('PNG', 1, 'ascii');
    raster.writeUInt32BE(1224, 16);
    raster.writeUInt32BE(792, 20);
    const engine = {
      render: jest.fn(async (source: Buffer) => {
        expect(source.subarray(0, 5).toString('ascii')).toBe('%PDF-');
        return {
          bytes: raster,
          width: 1224,
          height: 792,
          pageCount: 1,
          engine: 'SYNTHETIC_PDF_PROOF',
          engineVersion: '1',
          parameters: { pageNumber: 1, dpi: 300, format: 'PNG' },
        };
      }),
    };
    const pdfJobs = new DisplayPdfRenderJobService(
      prisma,
      storage,
      authorization,
      engine as never,
      renderer,
    );

    beforeAll(async () => prisma.$connect());
    afterAll(async () => prisma.$disconnect());

    it('publishes V1, supersedes it with independently approved V2, then revokes V2', async () => {
      const suffix = randomUUID();
      const assets = resolve(
        process.cwd(),
        '..',
        'docs',
        'coro-display',
        'DISPLAY-09-DEMO-PILOT',
        'assets',
      );
      const pdfs = [1, 2].map((version) =>
        readFileSync(
          resolve(assets, `CORO-DISPLAY-DEMO-TOUR-PREMONT-E03-V${version}.pdf`),
        ),
      );
      expect(pdfs[0].subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(pdfs[1].subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(createHash('sha256').update(pdfs[0]).digest('hex')).not.toBe(
        createHash('sha256').update(pdfs[1]).digest('hex'),
      );

      const organization = await prisma.organization.create({
        data: { name: `Display V1 V2 proof ${suffix}` },
      });
      const client = await prisma.client.create({
        data: { name: 'Client synthétique', organizationId: organization.id },
      });
      const building = await prisma.building.create({
        data: {
          name: 'Tour Prémont synthétique',
          address: '1 Démonstration',
          city: 'Montréal',
          province: 'QC',
          organizationId: organization.id,
          clientId: client.id,
        },
      });
      const floor = await prisma.buildingFloor.create({
        data: {
          organizationId: organization.id,
          buildingId: building.id,
          code: 'E03',
          name: 'Étage 3',
        },
      });
      const location = await prisma.displayLocation.create({
        data: {
          organizationId: organization.id,
          buildingId: building.id,
          floorId: floor.id,
          code: 'CORRIDOR-EST',
          label: 'Corridor Est — démonstration',
          youAreHereX: 0.5,
          youAreHereY: 0.5,
          orientationDegrees: 0,
        },
      });
      const createUser = (name: string, permissions: DisplayPermission[]) =>
        prisma.user.create({
          data: {
            email: `${name}-${suffix}@example.invalid`,
            password: 'not-used',
            firstName: name,
            lastName: 'QA',
            role: UserRole.OPERATOR,
            organizationId: organization.id,
            displayPermissions: permissions,
            displayBuildingIds: [building.id],
          },
        });
      const author = await createUser('author', [
        DisplayPermission.DISPLAY_PLAN_CREATE,
        DisplayPermission.DISPLAY_PLAN_READ,
      ]);
      const reviewer = await createUser('reviewer', [
        DisplayPermission.DISPLAY_PLAN_REVIEW,
      ]);
      const approver = await createUser('approver', [
        DisplayPermission.DISPLAY_PLAN_APPROVE,
      ]);
      const publisher = await createUser('publisher', [
        DisplayPermission.DISPLAY_PLAN_PUBLISH,
        DisplayPermission.DISPLAY_PLAN_READ,
      ]);
      const revoker = await createUser('revoker', [
        DisplayPermission.DISPLAY_PLAN_REVOKE,
      ]);
      const actor = (user: typeof author) => ({
        userId: user.id,
        organizationId: organization.id,
        role: user.role,
      });

      const publishVersion = async (version: number, bytes: Buffer) => {
        const sourceKey = `display09-proof/${suffix}/v${version}.pdf`;
        const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
        objects.set(sourceKey, Buffer.from(bytes));
        const file = await prisma.projectFile.create({
          data: {
            organizationId: organization.id,
            buildingId: building.id,
            name: `Plan d'évacuation synthétique V${version}.pdf`,
            category: 'plans_evacuation',
            size: bytes.length,
            mimeType: 'application/pdf',
            storageKey: sourceKey,
            url: `private:display09-proof-v${version}`,
            version,
            visibility: 'internal',
            status: 'valide',
            lifecycleState: 'APPROVED',
            sha256: sourceSha256,
            approvedAt: new Date(),
            approvedById: approver.id,
            effectiveAt: new Date(),
          },
        });
        const draft = await publications.createDraft(
          organization.id,
          building.id,
          {
            floorId: floor.id,
            locationId: location.id,
            projectFileId: file.id,
            sourceVersion: version,
            orientation: 'LANDSCAPE',
            language: 'FR',
            requestId: `create-v${version}-${suffix}`,
          },
          actor(author),
        );
        const job = await pdfJobs.enqueue(
          organization.id,
          building.id,
          draft.id,
          `render-v${version}-${suffix}`,
          actor(author),
        );
        expect(await pdfJobs.processNext(`worker-v${version}`)).toBe(true);
        expect(
          await prisma.displayPdfRenderJob.findUniqueOrThrow({
            where: { id: job.id },
          }),
        ).toMatchObject({ status: 'SUCCEEDED', sourceSha256 });
        const rendered = await prisma.displayPlanPublication.findUniqueOrThrow({
          where: { id: draft.id },
        });
        const submitted = await publications.submit(
          organization.id,
          building.id,
          draft.id,
          {
            expectedLockVersion: rendered.lockVersion,
            reason: `Soumission V${version}`,
            requestId: `submit-v${version}-${suffix}`,
          },
          actor(author),
        );
        const reviewed = await publications.markReviewed(
          organization.id,
          building.id,
          draft.id,
          {
            expectedLockVersion: submitted.lockVersion,
            reason: `Revue indépendante V${version}`,
            requestId: `review-v${version}-${suffix}`,
          },
          actor(reviewer),
        );
        const approved = await publications.approve(
          organization.id,
          building.id,
          draft.id,
          {
            expectedLockVersion: reviewed.lockVersion,
            reason: `Approbation indépendante V${version}`,
            requestId: `approve-v${version}-${suffix}`,
            sourceVersion: reviewed.sourceVersion,
            sourceSha256: reviewed.sourceSha256,
            variantVersion: reviewed.variantVersion,
            variantSha256: reviewed.variantSha256!,
            profile: 'SOURCE_NATIVE',
            locationId: reviewed.locationId,
          },
          actor(approver),
        );
        return publications.publish(
          organization.id,
          building.id,
          draft.id,
          {
            expectedLockVersion: approved.lockVersion,
            reason: `Publication V${version}`,
            requestId: `publish-v${version}-${suffix}`,
          },
          actor(publisher),
        );
      };

      const v1 = await publishVersion(1, pdfs[0]);
      expect(v1.status).toBe('PUBLISHED');
      const v2 = await publishVersion(2, pdfs[1]);
      expect(v2.status).toBe('PUBLISHED');
      expect(
        await prisma.displayPlanPublication.findUniqueOrThrow({
          where: { id: v1.id },
        }),
      ).toMatchObject({ status: 'SUPERSEDED', supersededById: v2.id });
      expect(
        await publications.playerContract(
          organization.id,
          building.id,
          location.id,
          actor(publisher),
        ),
      ).toMatchObject({
        publicationId: v2.id,
        status: 'PUBLISHED',
        documentVersion: 2,
      });

      const revoked = await publications.revoke(
        organization.id,
        building.id,
        v2.id,
        {
          expectedLockVersion: v2.lockVersion,
          reason: 'Révocation finale de la preuve',
          requestId: `revoke-v2-${suffix}`,
        },
        actor(revoker),
      );
      expect(revoked.status).toBe('REVOKED');
      await expect(
        publications.playerContract(
          organization.id,
          building.id,
          location.id,
          actor(publisher),
        ),
      ).rejects.toThrow('Aucune publication active');
      expect(
        await prisma.displayPlanPublication.count({
          where: { locationId: location.id, status: 'PUBLISHED' },
        }),
      ).toBe(0);
    }, 60_000);
  },
);
