import {
  CoroActorType,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationDeliveryMode,
  PopulationDeliveryStatus,
  PopulationOperationalEventStatus,
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PrismaClient,
  RueAssessmentStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  hashEvidenceSnapshot,
  PopulationEvidenceService,
} from '../src/population/population-evidence.service';
import { PopulationEvidenceReportService } from '../src/population/population-evidence-report.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error('TEST_DATABASE_URL est obligatoire en CI');
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Population evidence PostgreSQL invariants', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const service = new PopulationEvidenceService(prisma as any);
  const privateObjects = new Map<string, Buffer>();
  const reportService = new PopulationEvidenceReportService(prisma as any, {
    uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
      if (privateObjects.has(key)) throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
      privateObjects.set(key, Buffer.from(bytes)); return { storageKey: key };
    }),
    downloadPrivate: jest.fn(async (key: string) => {
      const bytes = privateObjects.get(key); if (!bytes) throw new Error('PRIVATE_OBJECT_NOT_FOUND'); return Buffer.from(bytes);
    }),
  } as any);
  const suffix = randomUUID();
  const ids = {
    organization: `evidence-org-${suffix}`,
    otherOrganization: `evidence-other-org-${suffix}`,
    client: `evidence-client-${suffix}`,
    building: `evidence-building-${suffix}`,
    profile: `evidence-profile-${suffix}`,
    program: `evidence-program-${suffix}`,
    scenario: `evidence-scenario-${suffix}`,
    event: `evidence-event-${suffix}`,
    activeEvent: `evidence-active-${suffix}`,
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: ids.organization, name: 'CORO Evidence Validation' },
        { id: ids.otherOrganization, name: 'Other tenant' },
      ],
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'Evidence client',
        organizationId: ids.organization,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        name: 'Evidence building',
        address: 'Test only',
        city: 'Boucherville',
        province: 'QC',
        organizationId: ids.organization,
        clientId: ids.client,
      },
    });
    await prisma.rueFacilityProfile.create({
      data: {
        id: ids.profile,
        buildingId: ids.building,
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
      },
    });
    await prisma.populationProgram.create({
      data: {
        id: ids.program,
        rueFacilityProfileId: ids.profile,
        status: PopulationProgramStatus.ACTIVE,
        deliveryMode: PopulationDeliveryMode.LIVE,
        publicSlug: `evidence-${suffix}`,
        nameFR: 'Evidence program',
      },
    });
    await prisma.rueEmergencyScenario.create({
      data: { id: ids.scenario, facilityProfileId: ids.profile, nameFR: 'Evidence scenario' },
    });
    await prisma.populationOperationalEvent.createMany({
      data: [
        {
          id: ids.event,
          organizationId: ids.organization,
          programId: ids.program,
          emergencyScenarioId: ids.scenario,
          status: PopulationOperationalEventStatus.ENDED,
          startedByType: CoroActorType.SYSTEM,
          startedById: 'postgres-test',
          endedByType: CoroActorType.SYSTEM,
          endedById: 'postgres-test',
          endedAt: new Date(),
        },
        {
          id: ids.activeEvent,
          organizationId: ids.organization,
          programId: ids.program,
          emergencyScenarioId: ids.scenario,
          status: PopulationOperationalEventStatus.ACTIVE,
          startedByType: CoroActorType.SYSTEM,
          startedById: 'postgres-test',
        },
      ],
    });
    const alerts = await Promise.all(
      [PopulationAlertType.TEST, PopulationAlertType.UPDATE, PopulationAlertType.ALL_CLEAR].map(
        (type, index) =>
          prisma.populationAlert.create({
            data: {
              programId: ids.program,
              operationalEventId: ids.event,
              emergencyScenarioId: ids.scenario,
              cycleSequence: index + 1,
              type,
              status: PopulationAlertStatus.ACTIVE,
              titleFR: `Communication ${index + 1}`,
              messageFR: `Message ${index + 1}`,
              createdByType: CoroActorType.SYSTEM,
              createdById: 'postgres-test',
              deliveryModeSnapshot: PopulationDeliveryMode.LIVE,
            },
          }),
      ),
    );
    for (const alert of alerts) {
      await prisma.populationAlertDelivery.create({
        data: {
          idempotencyKey: randomUUID(),
          alertId: alert.id,
          channel: 'EMAIL',
          status: PopulationDeliveryStatus.DELIVERED,
          language: PopulationPreferredLanguage.FR,
          messageSnapshot: alert.messageFR,
          deliveredAt: new Date(),
        },
      });
    }
  });

  afterAll(async () => prisma.$disconnect());

  it('refuse un événement ACTIVE', async () => {
    await expect(
      service.generateV1(ids.building, ids.organization, ids.activeEvent, {
        type: CoroActorType.SYSTEM,
        id: 'postgres-test',
      }),
    ).rejects.toThrow('uniquement après la clôture');
  });

  it('génère v1 concurremment une seule fois avec une référence stable', async () => {
    const generate = () =>
      service.generateV1(ids.building, ids.organization, ids.event, {
        type: CoroActorType.SYSTEM,
        id: 'postgres-test',
      });
    const [first, second] = await Promise.all([generate(), generate()]);
    expect(second.id).toBe(first.id);
    expect(second.reference).toBe(first.reference);
    expect(second.snapshotSha256).toBe(first.snapshotSha256);
    expect(first.reference).toMatch(/^CORO-SP-\d{4}-\d{6}$/);
    expect(await prisma.populationEvidenceRecord.count({ where: { operationalEventId: ids.event } })).toBe(1);
    expect(hashEvidenceSnapshot(first.snapshot)).toBe(first.snapshotSha256);
    expect((first.snapshot as any).summary).toMatchObject({
      communicationCount: 3,
      deliveryCount: 3,
      delivered: 3,
      completionStatus: 'COMPLETE',
    });
  });

  it('applique tenant scope et IDOR', async () => {
    const record = await service.getForEvent(ids.building, ids.organization, ids.event);
    await expect(service.getForEvent(ids.building, ids.otherOrganization, ids.event)).rejects.toThrow();
    await expect(service.getById(ids.building, ids.otherOrganization, record.id)).rejects.toThrow();
    await expect(service.getById('other-building', ids.organization, record.id)).rejects.toThrow();
  });

  it('génère un seul manifest v1 concurrent et vérifie son intégrité', async () => {
    const evidence = await service.getForEvent(ids.building, ids.organization, ids.event);
    const generate = () =>
      service.generateManifestV1(ids.building, ids.organization, evidence.id, {
        type: CoroActorType.SYSTEM,
        id: 'postgres-test',
      });
    const [first, second] = await Promise.all([generate(), generate()]);
    expect(second.id).toBe(first.id);
    expect(second.manifestSha256).toBe(first.manifestSha256);
    expect(
      await prisma.populationEvidenceManifest.count({
        where: { evidenceRecordId: evidence.id },
      }),
    ).toBe(1);
    await expect(
      service.verify(ids.building, ids.organization, evidence.id),
    ).resolves.toMatchObject({
      status: 'VERIFIED',
      snapshot: true,
      manifest: true,
    });
  });

  it('scope le manifest et sa vérification au tenant et au bâtiment', async () => {
    const evidence = await service.getForEvent(ids.building, ids.organization, ids.event);
    await expect(
      service.getManifest(ids.building, ids.otherOrganization, evidence.id),
    ).rejects.toThrow();
    await expect(
      service.verify(ids.building, ids.otherOrganization, evidence.id),
    ).rejects.toThrow();
    await expect(
      service.getManifest('other-building', ids.organization, evidence.id),
    ).rejects.toThrow();
  });

  it('impose manifest version unique et interdit UPDATE/DELETE', async () => {
    const evidence = await service.getForEvent(ids.building, ids.organization, ids.event);
    const manifest = await service.getManifest(ids.building, ids.organization, evidence.id);
    await expect(
      prisma.populationEvidenceManifest.create({
        data: {
          organizationId: ids.organization,
          buildingId: ids.building,
          programId: ids.program,
          operationalEventId: ids.event,
          evidenceRecordId: evidence.id,
          schemaVersion: 'population-evidence-manifest/v1',
          version: 1,
          generatedByType: CoroActorType.SYSTEM,
          generatedById: 'duplicate',
          manifest: {},
          manifestSha256: '0'.repeat(64),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.populationEvidenceManifest.update({
        where: { id: manifest.id },
        data: { manifestSha256: '1'.repeat(64) },
      }),
    ).rejects.toThrow('immutable');
    await expect(
      prisma.populationEvidenceManifest.delete({ where: { id: manifest.id } }),
    ).rejects.toThrow('immutable');
    await expect(
      prisma.populationEvidenceRecord.delete({ where: { id: evidence.id } }),
    ).rejects.toThrow();
  });

  it('genere un report v1 concurrent unique, tenant-safe, hash-verifie et immuable', async () => {
    const evidence = await service.getForEvent(ids.building, ids.organization, ids.event);
    const generate = () => reportService.generate(ids.building, ids.organization, evidence.id, { type: CoroActorType.SYSTEM, id: 'postgres-test' });
    const [first, second] = await Promise.all([generate(), generate()]);
    expect(second.id).toBe(first.id);
    expect(first.status).toBe('FINALIZED');
    expect(first.reportSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.fileSize).toBeGreaterThan(1000);
    expect((first as any).storageKey).toBeUndefined();
    expect(await prisma.populationEvidenceReport.count({ where: { evidenceRecordId: evidence.id } })).toBe(1);
    const downloaded = await reportService.download(ids.building, ids.organization, evidence.id);
    expect(downloaded.bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(downloaded.filename).toBe(`${evidence.reference}_v1.pdf`);
    await expect(reportService.get(ids.building, ids.otherOrganization, evidence.id)).rejects.toThrow();
    await expect(reportService.download('other-building', ids.organization, evidence.id)).rejects.toThrow();
    await expect(prisma.populationEvidenceReport.update({ where: { id: first.id }, data: { reportSha256: '0'.repeat(64) } })).rejects.toThrow('immutable');
    await expect(prisma.populationEvidenceReport.delete({ where: { id: first.id } })).rejects.toThrow('immutable');
  });

  it('impose event/version unique et refuse UPDATE/DELETE FINALIZED', async () => {
    const record = await service.getForEvent(ids.building, ids.organization, ids.event);
    await expect(
      prisma.populationEvidenceRecord.create({
        data: {
          organizationId: ids.organization,
          buildingId: ids.building,
          programId: ids.program,
          operationalEventId: ids.event,
          schemaVersion: 'population-evidence/v1',
          version: 1,
          generatedByType: CoroActorType.SYSTEM,
          generatedById: 'duplicate',
          finalizedByType: CoroActorType.SYSTEM,
          finalizedById: 'duplicate',
          snapshot: {},
          snapshotSha256: '0'.repeat(64),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.populationEvidenceRecord.update({
        where: { id: record.id },
        data: { snapshotSha256: '1'.repeat(64) },
      }),
    ).rejects.toThrow('immutable');
    await expect(
      prisma.populationEvidenceRecord.delete({ where: { id: record.id } }),
    ).rejects.toThrow('immutable');
  });
});
