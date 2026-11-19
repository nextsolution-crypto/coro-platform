import { CoroActorType, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('CORO Report 2 import constraints on PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const ids = {
    organization: randomUUID(),
    otherOrganization: randomUUID(),
    client: randomUUID(),
    building: randomUUID(),
    batch: randomUUID(),
    file: randomUUID(),
    mapping: randomUUID(),
    preview: randomUUID(),
    run: randomUUID(),
    historical: randomUUID(),
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: ids.organization, name: 'R2 synthetic organization' },
        { id: ids.otherOrganization, name: 'R2 isolated organization' },
      ],
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        organizationId: ids.organization,
        name: 'R2 synthetic client',
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        organizationId: ids.organization,
        clientId: ids.client,
        name: 'R2 synthetic building',
        address: '1 Synthetic',
        city: 'Montréal',
        province: 'QC',
      },
    });
  });

  afterAll(async () => {
    await prisma.incidentReportImportItem.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportHistoricalRecord.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportImportRun.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportImportPreview.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportImportMapping.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportImportFile.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportImportEvent.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.incidentReportImportBatch.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.building.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.client.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.organization.deleteMany({ where: { id: { in: [ids.organization, ids.otherOrganization] } } });
    await prisma.$disconnect();
  });

  it('persists an isolated provenance chain and rejects duplicate source identities', async () => {
    await prisma.incidentReportImportBatch.create({
      data: {
        id: ids.batch,
        organizationId: ids.organization,
        buildingId: ids.building,
        sourceSystem: 'REPORTPERFECT',
        status: 'READY',
        idempotencyKey: randomUUID(),
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'r2-postgres-test',
      },
    });
    await prisma.incidentReportImportFile.create({
      data: {
        id: ids.file,
        organizationId: ids.organization,
        batchId: ids.batch,
        originalFileName: 'synthetic.json',
        mediaType: 'application/json',
        sizeBytes: 100,
        sha256: 'a'.repeat(64),
        storageKey: `synthetic/${ids.file}`,
        scanStatus: 'CLEAN',
        status: 'ANALYZED',
        recordCount: 1,
      },
    });
    await prisma.incidentReportImportMapping.create({
      data: {
        id: ids.mapping,
        organizationId: ids.organization,
        batchId: ids.batch,
        version: 1,
        rules: [],
        rulesHash: 'b'.repeat(64),
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'r2-postgres-test',
      },
    });
    await prisma.incidentReportImportPreview.create({
      data: {
        id: ids.preview,
        organizationId: ids.organization,
        batchId: ids.batch,
        fileId: ids.file,
        mappingId: ids.mapping,
        sourceFileHash: 'a'.repeat(64),
        mappingHash: 'b'.repeat(64),
        summary: { conflictCount: 0 },
        conflicts: [],
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'r2-postgres-test',
      },
    });
    await prisma.incidentReportImportRun.create({
      data: {
        id: ids.run,
        organizationId: ids.organization,
        buildingId: ids.building,
        batchId: ids.batch,
        fileId: ids.file,
        mappingId: ids.mapping,
        totalRecords: 1,
        idempotencyKey: randomUUID(),
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'r2-postgres-test',
      },
    });
    await prisma.incidentReportHistoricalRecord.create({
      data: {
        id: ids.historical,
        organizationId: ids.organization,
        buildingId: ids.building,
        importBatchId: ids.batch,
        importRunId: ids.run,
        sourceSystem: 'REPORTPERFECT',
        sourceObjectType: 'INCIDENT_REPORT',
        sourceObjectId: 'RP-SYNTHETIC-1',
        sourceHash: 'c'.repeat(64),
        searchText: 'RP-SYNTHETIC-1 Synthetic',
        mappedContent: { title: 'Synthetic' },
        originalContent: { legacy_title: 'Synthetic' },
        provenanceManifest: { origin: 'HISTORICAL_IMPORT', nativeCoroApproval: false },
      },
    });
    await expect(
      prisma.incidentReportHistoricalRecord.create({
        data: {
          organizationId: ids.organization,
          buildingId: ids.building,
          importBatchId: ids.batch,
          importRunId: ids.run,
          sourceSystem: 'REPORTPERFECT',
          sourceObjectType: 'INCIDENT_REPORT',
          sourceObjectId: 'RP-SYNTHETIC-1',
          sourceHash: 'd'.repeat(64),
          searchText: 'RP-SYNTHETIC-1 duplicate',
          mappedContent: {},
          originalContent: {},
          provenanceManifest: { origin: 'HISTORICAL_IMPORT', nativeCoroApproval: false },
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a cross-tenant building association at the composite FK', async () => {
    await expect(
      prisma.incidentReportImportBatch.create({
        data: {
          organizationId: ids.otherOrganization,
          buildingId: ids.building,
          sourceSystem: 'REPORTPERFECT',
          idempotencyKey: randomUUID(),
          createdByActorType: CoroActorType.SYSTEM,
          createdByActorId: 'r2-postgres-test',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});

