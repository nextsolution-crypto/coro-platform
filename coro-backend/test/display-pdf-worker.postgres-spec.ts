import { createHash } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { DisplayPdfRenderJobService } from '../src/display-plans/display-pdf-render-job.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('DISPLAY-04A PDF queue on isolated PostgreSQL 16', () => {
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();
  const ids: Record<string, string> = {};
  const source = Buffer.from('%PDF-1.4\nsynthetic passive fixture\n%%EOF');
  const sha = createHash('sha256').update(source).digest('hex');

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = Date.now().toString();
    const org = await prisma.organization.create({
      data: { name: `PDF ${suffix}` },
    });
    const client = await prisma.client.create({
      data: {
        name: `PDF ${suffix}`,
        organizationId: org.id,
        regulatoryRequirements: [],
      },
    });
    const building = await prisma.building.create({
      data: {
        name: 'PDF QA',
        address: '1 QA',
        city: 'Montreal',
        province: 'QC',
        organizationId: org.id,
        clientId: client.id,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `pdf-${suffix}@example.invalid`,
        password: 'synthetic',
        firstName: 'PDF',
        lastName: 'QA',
        organizationId: org.id,
      },
    });
    const floor = await prisma.buildingFloor.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        code: 'RDC',
        name: 'RDC',
      },
    });
    const location = await prisma.displayLocation.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        floorId: floor.id,
        code: 'QA',
        label: 'QA',
        youAreHereX: 0.5,
        youAreHereY: 0.5,
        orientationDegrees: 0,
      },
    });
    const file = await prisma.projectFile.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        name: 'qa.pdf',
        category: 'plans_evacuation',
        size: source.length,
        mimeType: 'application/pdf',
        storageKey: 'synthetic/source.pdf',
        url: 'private:synthetic',
        lifecycleState: 'APPROVED',
        status: 'valide',
        sha256: sha,
        approvedAt: new Date(),
        approvedById: user.id,
      },
    });
    const publication = await prisma.displayPlanPublication.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        floorId: floor.id,
        locationId: location.id,
        projectFileId: file.id,
        creationRequestId: `create-${suffix}`,
        sourceVersion: 1,
        sourceSha256: sha,
        sourceApprovedById: user.id,
        sourceApprovedAt: new Date(),
        versionNumber: 1,
        orientation: 'LANDSCAPE',
        language: 'FR',
        renderParameters: {},
        createdById: user.id,
      },
    });
    Object.assign(ids, {
      org: org.id,
      building: building.id,
      user: user.id,
      file: file.id,
      publication: publication.id,
    });
  });

  afterAll(async () => {
    await prisma.displayPdfRenderJob.deleteMany({
      where: { organizationId: ids.org },
    });
    await prisma.displayPlanPublication.deleteMany({
      where: { organizationId: ids.org },
    });
    await prisma.displayLocation.deleteMany({
      where: { organizationId: ids.org },
    });
    await prisma.buildingFloor.deleteMany({
      where: { organizationId: ids.org },
    });
    await prisma.projectFile.deleteMany({ where: { organizationId: ids.org } });
    await prisma.user.deleteMany({ where: { organizationId: ids.org } });
    await prisma.building.deleteMany({ where: { organizationId: ids.org } });
    await prisma.client.deleteMany({ where: { organizationId: ids.org } });
    await prisma.organization.delete({ where: { id: ids.org } });
    await prisma.$disconnect();
  });

  const createJob = (requestId: string) =>
    prisma.displayPdfRenderJob.create({
      data: {
        publicationId: ids.publication,
        organizationId: ids.org,
        buildingId: ids.building,
        requestId,
        requestedById: ids.user,
        sourceProjectFileId: ids.file,
        sourceVersion: 1,
        sourceSha256: sha,
        sourceStorageKey: 'synthetic/source.pdf',
        sourceMimeType: 'application/pdf',
      },
    });

  it('atomically claims once, recovers a crash lease, and enforces idempotence', async () => {
    const job = await createJob(`claim-${Date.now()}`);
    const service = new DisplayPdfRenderJobService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const claim = (worker: string) =>
      (
        service as unknown as {
          claim(id: string): Promise<{ id: string } | null>;
        }
      ).claim(worker);
    const claimed = await Promise.all([claim('worker-a'), claim('worker-b')]);
    expect(claimed.filter(Boolean)).toHaveLength(1);
    await prisma.displayPdfRenderJob.update({
      where: { id: job.id },
      data: { heartbeatAt: new Date(0) },
    });
    await service.recoverAbandoned(new Date(1));
    expect((await claim('worker-c'))?.id).toBe(job.id);
    await expect(createJob(job.requestId)).rejects.toBeTruthy();
  });

  it('fails an exhausted lease and rejects invalid bounds in PostgreSQL', async () => {
    const exhausted = await createJob(`exhausted-${Date.now()}`);
    await prisma.displayPdfRenderJob.update({
      where: { id: exhausted.id },
      data: { status: 'PROCESSING', attempts: 3, heartbeatAt: new Date(0) },
    });
    const service = new DisplayPdfRenderJobService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await service.recoverAbandoned(new Date(1));
    expect(
      (
        await prisma.displayPdfRenderJob.findUniqueOrThrow({
          where: { id: exhausted.id },
        })
      ).status,
    ).toBe('FAILED');
    await expect(
      prisma.displayPdfRenderJob.create({
        data: {
          publicationId: ids.publication,
          organizationId: ids.org,
          buildingId: ids.building,
          requestId: `bad-${Date.now()}`,
          requestedById: ids.user,
          sourceProjectFileId: ids.file,
          sourceVersion: 1,
          sourceSha256: sha,
          sourceStorageKey: 'x',
          sourceMimeType: 'application/pdf',
          targetDpi: 301,
        },
      }),
    ).rejects.toBeTruthy();
  });

  it('refuses an authority revoked during rasterization without publishing', async () => {
    const job = await createJob(`revoke-${Date.now()}`);
    let release!: (value: unknown) => void;
    const gate = new Promise((resolve) => (release = resolve));
    const engine = {
      render: jest.fn(async () => {
        await gate;
        return {
          bytes: Buffer.from('png'),
          width: 1,
          height: 1,
          pageCount: 1,
          engine: 'POPPLER',
          engineVersion: 'qa',
          parameters: { pageNumber: 1, dpi: 300, format: 'PNG' },
        };
      }),
    };
    const storage = {
      downloadPrivate: jest.fn().mockResolvedValue(source),
      uploadPrivateImmutable: jest.fn().mockResolvedValue({}),
    };
    const overlay = {
      render: jest.fn().mockReturnValue({
        bytes: Buffer.from('<svg/>'),
        mimeType: 'image/svg+xml',
      }),
    };
    const service = new DisplayPdfRenderJobService(
      prisma,
      storage as never,
      {} as never,
      engine as never,
      overlay as never,
    );
    const running = service.processNext('worker-revoke');
    while (engine.render.mock.calls.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 5));
    await prisma.projectFile.update({
      where: { id: ids.file },
      data: {
        lifecycleState: 'REVOKED',
        revokedAt: new Date(),
        revokedById: ids.user,
        revocationReason: 'QA',
      },
    });
    release(undefined);
    await running;
    const result = await prisma.displayPdfRenderJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(result).toMatchObject({
      status: 'FAILED',
      failureCode: 'AUTHORITY_CHANGED',
    });
    expect(
      (
        await prisma.displayPlanPublication.findUniqueOrThrow({
          where: { id: ids.publication },
        })
      ).variantSha256,
    ).toBeNull();
    await prisma.projectFile.update({
      where: { id: ids.file },
      data: {
        lifecycleState: 'APPROVED',
        revokedAt: null,
        revokedById: null,
        revocationReason: null,
      },
    });
  });
});
