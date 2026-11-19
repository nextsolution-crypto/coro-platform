import { CoroActorType, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { IncidentReportAccessService } from '../src/incident-reports/incident-report-access.service';
import { IncidentReportImportExecutionService } from '../src/incident-reports/incident-report-import-execution.service';
import { IncidentReportImportMappingService } from '../src/incident-reports/incident-report-import-mapping.service';
import { IncidentReportImportService } from '../src/incident-reports/incident-report-import.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('CORO Report 2 synthetic multi-year pilot', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const ids = {
    organization: randomUUID(),
    client: randomUUID(),
    building: randomUUID(),
    user: randomUUID(),
  };
  const actor = {
    userId: ids.user,
    organizationId: ids.organization,
    role: 'OPERATOR',
  };
  const objects = new Map<string, Buffer>();
  const storage = {
    uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
      if (objects.has(key)) throw new Error('immutable collision');
      objects.set(key, Buffer.from(bytes));
    }),
    downloadPrivate: jest.fn(async (key: string) => {
      const bytes = objects.get(key);
      if (!bytes) throw new Error('private object missing');
      return Buffer.from(bytes);
    }),
  };
  const scanner = { scan: jest.fn(async () => 'CLEAN' as const) };
  const access = { require: jest.fn(async () => undefined) };
  const staging = new IncidentReportImportService(
    prisma as never,
    storage as never,
    scanner as never,
    access as unknown as IncidentReportAccessService,
  );
  const mappings = new IncidentReportImportMappingService(
    prisma as never,
    staging,
    access as unknown as IncidentReportAccessService,
  );
  const executions = new IncidentReportImportExecutionService(
    prisma as never,
    staging,
    mappings,
    access as unknown as IncidentReportAccessService,
  );

  beforeAll(async () => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    process.env.INCIDENT_REPORT_IMPORT_ENABLED = 'true';
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: ids.organization, name: 'CORO Report 2 synthetic pilot' },
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        organizationId: ids.organization,
        name: 'Synthetic property manager',
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        organizationId: ids.organization,
        clientId: ids.client,
        name: 'Synthetic archive tower',
        address: '1 Synthetic',
        city: 'Montréal',
        province: 'QC',
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        organizationId: ids.organization,
        email: `${ids.user}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Importer',
        role: 'OPERATOR',
      },
    });
  });

  afterAll(async () => {
    await prisma.incidentReportImportItem.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportHistoricalRecord.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportImportRun.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportImportPreview.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportImportMapping.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportImportFile.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportImportEvent.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.incidentReportImportBatch.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.coroActorIdentity.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.user.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.building.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.client.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.organization.delete({ where: { id: ids.organization } });
    await prisma.$disconnect();
    delete process.env.INCIDENT_REPORTS_ENABLED;
    delete process.env.INCIDENT_REPORT_IMPORT_ENABLED;
  });

  it('stages, previews, resumes, reconciles and rolls back a multi-year archive', async () => {
    const uniqueRecords = Array.from({ length: 36 }, (_, index) => ({
      legacy_id: `RP-${String(index + 1).padStart(4, '0')}`,
      title: `Synthetic incident ${index + 1}`,
      occurred_at: `${2021 + (index % 6)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
      category: index % 2 ? 'SECURITY' : 'PROPERTY',
    }));
    const records = [...uniqueRecords, { ...uniqueRecords[0] }];
    const batch = await staging.createBatch(
      ids.organization,
      {
        buildingId: ids.building,
        sourceSystem: 'REPORTPERFECT',
        sourceSchemaVersion: 'SYNTHETIC-2021-2026',
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    const file = await staging.stageFile(
      ids.organization,
      batch.id,
      {
        originalFileName: 'reportperfect-synthetic-2021-2026.json',
        mediaType: 'application/json',
        fileBase64: Buffer.from(JSON.stringify(records)).toString('base64'),
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    await staging.analyze(
      ids.organization,
      batch.id,
      file.id,
      { expectedMaximumRecords: 100_000, idempotencyKey: randomUUID() },
      actor,
    );
    const mapping = await mappings.configure(
      ids.organization,
      batch.id,
      {
        rules: [
          {
            sourceHeader: 'legacy_id',
            canonicalField: 'legacy.source_id',
            transform: 'TRIM',
            required: true,
          },
          {
            sourceHeader: 'title',
            canonicalField: 'incident.title',
            transform: 'TRIM',
            required: true,
          },
          {
            sourceHeader: 'occurred_at',
            canonicalField: 'incident.occurred_at',
            transform: 'DATE_ISO',
            required: true,
          },
          {
            sourceHeader: 'category',
            canonicalField: 'incident.category',
            transform: 'UPPERCASE',
            required: true,
          },
        ],
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    const preview = await mappings.preview(
      ids.organization,
      batch.id,
      {
        fileId: file.id,
        mappingId: mapping.id,
        maximumPreviewRows: 100,
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    expect(preview.preview.summary).toMatchObject({ conflictCount: 0 });
    let run = await executions.start(
      ids.organization,
      batch.id,
      { fileId: file.id, mappingId: mapping.id, idempotencyKey: randomUUID() },
      actor,
    );
    run = await executions.processNext(
      ids.organization,
      run.id,
      {
        expectedLockVersion: run.lockVersion,
        batchSize: 7,
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    expect(run.cursor).toBe(7);
    const recovered = await executions.get(ids.organization, run.id, actor);
    expect(recovered.cursor).toBe(7);
    while (run.status !== 'COMPLETED') {
      run = await executions.processNext(
        ids.organization,
        run.id,
        {
          expectedLockVersion: run.lockVersion,
          batchSize: 8,
          idempotencyKey: randomUUID(),
        },
        actor,
      );
    }
    expect(run.importedCount).toBe(36);
    expect(run.duplicateCount).toBe(1);
    const reconciliation = await executions.reconcile(
      ids.organization,
      run.id,
      actor,
    );
    expect(reconciliation).toMatchObject({
      consistent: true,
      activeRecords: 36,
    });
    const archives = await prisma.incidentReportHistoricalRecord.findMany({
      where: {
        organizationId: ids.organization,
        importRunId: run.id,
        status: 'ACTIVE',
      },
    });
    expect(archives).toHaveLength(36);
    expect(
      archives.every(
        (archive) =>
          (archive.provenanceManifest as any).nativeCoroApproval === false,
      ),
    ).toBe(true);
    const rollback = await executions.rollback(
      ids.organization,
      run.id,
      {
        expectedLockVersion: run.lockVersion,
        reason: 'Synthetic pilot cleanup',
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    expect(rollback.rolledBackRecords).toBe(36);
    expect(
      await prisma.incidentReportHistoricalRecord.count({
        where: {
          organizationId: ids.organization,
          importRunId: run.id,
          status: 'ACTIVE',
        },
      }),
    ).toBe(0);
  });
});
