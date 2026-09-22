import {
  CoroActorType,
  OperationalReviewConfidentiality,
  OperationalReviewPermission,
  OperationalReviewStatus,
  OperationalReviewReportSupersessionReason,
  PopulationDeliveryMode,
  PopulationOperationalEventStatus,
  PopulationProgramStatus,
  PrismaClient,
  RueAssessmentStatus,
  ReviewFindingCategory,
  ReviewFindingSeverity,
  ReviewRecommendationStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { OperationalReviewsService } from '../src/operational-reviews/operational-reviews.service';
import { OperationalReviewReportService } from '../src/operational-reviews/operational-review-report.service';
import { OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION } from '../src/operational-reviews/operational-review-report.renderer';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error('TEST_DATABASE_URL est obligatoire en CI');
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('OperationalReview PostgreSQL invariants', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const service = new OperationalReviewsService(prisma as any);
  const suffix = randomUUID();
  const ids = {
    organization: `review-org-${suffix}`,
    otherOrganization: `review-other-org-${suffix}`,
    client: `review-client-${suffix}`,
    building: `review-building-${suffix}`,
    profile: `review-profile-${suffix}`,
    program: `review-program-${suffix}`,
    scenario: `review-scenario-${suffix}`,
    event: `review-event-${suffix}`,
    secondEvent: `review-event-2-${suffix}`,
    thirdEvent: `review-event-3-${suffix}`,
    user: `review-user-${suffix}`,
  };
  const actor = {
    sub: ids.user,
    organizationId: ids.organization,
    clientId: ids.client,
    role: 'CLIENT_MANAGER',
    buildingIds: [ids.building],
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({ data: [{ id: ids.organization, name: 'REX tests' }, { id: ids.otherOrganization, name: 'Other tenant' }] });
    await prisma.client.create({ data: { id: ids.client, name: 'REX client', organizationId: ids.organization, regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: ids.building, name: 'REX building', address: 'Test only', city: 'Test', province: 'QC', organizationId: ids.organization, clientId: ids.client } });
    await prisma.clientUser.create({ data: { id: ids.user, email: `review-${suffix}@example.invalid`, password: 'not-used', firstName: 'Review', lastName: 'Tester', buildingIds: [ids.building], clientId: ids.client, organizationId: ids.organization, operationalReviewPermissions: Object.values(OperationalReviewPermission) } });
    await prisma.rueFacilityProfile.create({ data: { id: ids.profile, buildingId: ids.building, assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT, populationEnabled: true } });
    await prisma.populationProgram.create({ data: { id: ids.program, rueFacilityProfileId: ids.profile, status: PopulationProgramStatus.ACTIVE, deliveryMode: PopulationDeliveryMode.SANDBOX, publicSlug: `review-${suffix}`, nameFR: 'REX program' } });
    await prisma.rueEmergencyScenario.create({ data: { id: ids.scenario, facilityProfileId: ids.profile, nameFR: 'REX scenario' } });
    await prisma.populationOperationalEvent.createMany({ data: [ids.event, ids.secondEvent, ids.thirdEvent].map((id) => ({ id, organizationId: ids.organization, programId: ids.program, emergencyScenarioId: ids.scenario, status: PopulationOperationalEventStatus.ENDED, startedByType: CoroActorType.SYSTEM, startedById: 'postgres-test', endedByType: CoroActorType.SYSTEM, endedById: 'postgres-test', endedAt: new Date() })) });
  });

  afterAll(async () => prisma.$disconnect());

  it('genere une reference REX par sequence PostgreSQL', async () => {
    const review = await service.create({ title: 'Review sequence', populationOperationalEventId: ids.event }, actor);
    expect(review.reference).toMatch(/^REX-\d{4}-\d{6}$/);
  });

  it('rend la creation v1 concurrente idempotente', async () => {
    const create = () => service.create({ title: 'Concurrent review', populationOperationalEventId: ids.secondEvent }, actor);
    const [first, second] = await Promise.all([create(), create()]);
    expect(second.id).toBe(first.id);
    expect(second.reference).toBe(first.reference);
    expect(await prisma.operationalReview.count({ where: { populationOperationalEventId: ids.secondEvent } })).toBe(1);
  });

  it('refuse zero ou plusieurs sources au niveau PostgreSQL', async () => {
    const common = { id: randomUUID(), organizationId: ids.organization, title: 'Invalid', createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' };
    await expect(prisma.operationalReview.create({ data: common as any })).rejects.toThrow();
    await expect(prisma.operationalReview.create({ data: { ...common, id: randomUUID(), populationOperationalEventId: ids.event, incidentEventId: randomUUID() } as any })).rejects.toThrow();
  });

  it('refuse une seconde v1 non supersedee pour la meme source', async () => {
    await expect(prisma.operationalReview.create({ data: { organizationId: ids.organization, title: 'Duplicate', populationOperationalEventId: ids.event, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } })).rejects.toThrow();
  });

  it('rend les evenements audit append-only', async () => {
    const review = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.event }, include: { auditEvents: true } });
    expect(review.auditEvents).toHaveLength(1);
    await expect(prisma.operationalReviewAuditEvent.update({ where: { id: review.auditEvents[0].id }, data: { metadata: { changed: true } } })).rejects.toThrow('append-only');
    await expect(prisma.operationalReviewAuditEvent.delete({ where: { id: review.auditEvents[0].id } })).rejects.toThrow('append-only');
  });

  it('rend un Review FINALIZED immuable et non supprimable', async () => {
    const review = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.event } });
    await prisma.operationalReview.update({ where: { id: review.id }, data: { status: OperationalReviewStatus.IN_REVIEW } });
    await prisma.operationalReview.update({ where: { id: review.id }, data: { status: OperationalReviewStatus.FINALIZED, finalizedAt: new Date(), finalizedByType: CoroActorType.SYSTEM, finalizedById: 'postgres-test' } });
    await expect(prisma.operationalReview.update({ where: { id: review.id }, data: { title: 'Mutation' } })).rejects.toThrow('immutable');
    await expect(prisma.operationalReview.delete({ where: { id: review.id } })).rejects.toThrow('immutable');
  });

  it('refuse les incoherences tenant et Evidence/Population', async () => {
    await expect(prisma.operationalReview.create({ data: { organizationId: ids.otherOrganization, title: 'Tenant mismatch', populationOperationalEventId: ids.secondEvent, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test', confidentiality: OperationalReviewConfidentiality.RESTRICTED } })).rejects.toThrow('tenant mismatch');
    const review = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.secondEvent } });
    await expect(service.get(review.id, { ...actor, organizationId: ids.otherOrganization })).rejects.toThrow();
  });

  it('garantit tenant et meme Review pour Finding/Recommendation', async () => {
    const parent = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.secondEvent } });
    const other = await service.create({ title: 'Other review', populationOperationalEventId: ids.thirdEvent }, actor);
    await expect(prisma.reviewFinding.create({ data: { organizationId: ids.otherOrganization, operationalReviewId: parent.id, category: ReviewFindingCategory.GAP, title: 'Invalid tenant', description: 'Invalid', severity: ReviewFindingSeverity.HIGH, displayOrder: 1, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } })).rejects.toThrow();
    const finding = await prisma.reviewFinding.create({ data: { organizationId: ids.organization, operationalReviewId: parent.id, category: ReviewFindingCategory.GAP, title: 'Finding', description: 'Description', severity: ReviewFindingSeverity.HIGH, displayOrder: 1, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } });
    await expect(prisma.reviewRecommendation.create({ data: { organizationId: ids.organization, operationalReviewId: other.id, reviewFindingId: finding.id, description: 'Wrong review', displayOrder: 1, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } })).rejects.toThrow();
    await expect(prisma.reviewRecommendation.create({ data: { organizationId: ids.otherOrganization, operationalReviewId: parent.id, reviewFindingId: finding.id, description: 'Wrong tenant', displayOrder: 1, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } })).rejects.toThrow();
  });

  it('fige Finding et Recommendation lorsque le Review est FINALIZED', async () => {
    const parent = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.secondEvent } });
    const finding = await prisma.reviewFinding.findFirstOrThrow({ where: { operationalReviewId: parent.id } });
    const recommendation = await prisma.reviewRecommendation.create({ data: { organizationId: ids.organization, operationalReviewId: parent.id, reviewFindingId: finding.id, description: 'Recommendation', status: ReviewRecommendationStatus.PROPOSED, displayOrder: 1, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } });
    await prisma.operationalReview.update({ where: { id: parent.id }, data: { status: OperationalReviewStatus.IN_REVIEW } });
    await prisma.operationalReview.update({ where: { id: parent.id }, data: { status: OperationalReviewStatus.FINALIZED, finalizedAt: new Date(), finalizedByType: CoroActorType.SYSTEM, finalizedById: 'postgres-test' } });
    const findingData = { organizationId: ids.organization, operationalReviewId: parent.id, category: ReviewFindingCategory.OBSERVATION, title: 'Late', description: 'Late', severity: ReviewFindingSeverity.LOW, displayOrder: 2, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' };
    await expect(prisma.reviewFinding.create({ data: findingData })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewFinding.update({ where: { id: finding.id }, data: { title: 'Mutation' } })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewFinding.delete({ where: { id: finding.id } })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewRecommendation.create({ data: { organizationId: ids.organization, operationalReviewId: parent.id, reviewFindingId: finding.id, description: 'Late', displayOrder: 2, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewRecommendation.update({ where: { id: recommendation.id }, data: { description: 'Mutation' } })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewRecommendation.delete({ where: { id: recommendation.id } })).rejects.toThrow('children are immutable');
  });

  it('refuse de deplacer un Finding ou une Recommendation hors du REX finalise', async () => {
    const finalized = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.secondEvent } });
    const destination = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.thirdEvent } });
    const sourceFinding = await prisma.reviewFinding.findFirstOrThrow({ where: { operationalReviewId: finalized.id } });
    const sourceRecommendation = await prisma.reviewRecommendation.findFirstOrThrow({ where: { operationalReviewId: finalized.id } });
    const destinationFinding = await prisma.reviewFinding.create({ data: { organizationId: ids.organization, operationalReviewId: destination.id, category: ReviewFindingCategory.OBSERVATION, title: 'Destination', description: 'Test', severity: ReviewFindingSeverity.LOW, displayOrder: 1, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } });
    await expect(prisma.reviewFinding.update({ where: { id: sourceFinding.id }, data: { operationalReviewId: destination.id, displayOrder: 2 } })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewRecommendation.update({ where: { id: sourceRecommendation.id }, data: { operationalReviewId: destination.id, reviewFindingId: destinationFinding.id } })).rejects.toThrow('children are immutable');
    await expect(prisma.reviewFinding.create({ data: { organizationId: ids.organization, operationalReviewId: finalized.id, category: ReviewFindingCategory.GAP, title: 'Late', description: 'Test', severity: ReviewFindingSeverity.HIGH, displayOrder: 3, createdByType: CoroActorType.SYSTEM, createdById: 'postgres-test' } })).rejects.toThrow('children are immutable');
  });

  it('genere un seul rapport PDF prive, stable, tenant-scoped et immutable', async () => {
    const review = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.event } });
    const objects = new Map<string, Buffer>();
    const storage = {
      uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
        if (objects.has(key)) throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
        objects.set(key, Buffer.from(bytes));
        return { storageKey: key };
      }),
      downloadPrivate: jest.fn(async (key: string) => {
        const bytes = objects.get(key);
        if (!bytes) throw new Error('PRIVATE_OBJECT_NOT_FOUND');
        return Buffer.from(bytes);
      }),
    };
    const reports = new OperationalReviewReportService(prisma as any, storage as any, service);
    await expect(reports.generate(ids.thirdEvent, actor)).rejects.toThrow();
    const draft = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.thirdEvent } });
    await expect(reports.generate(draft.id, actor)).rejects.toThrow('finalisé');
    await expect(reports.get(review.id, { ...actor, organizationId: ids.otherOrganization })).rejects.toThrow();
    const results = await Promise.allSettled([reports.generate(review.id, actor), reports.generate(review.id, actor)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const first = (results.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
    expect(first.status).toBe('FINALIZED');
    expect(first).not.toHaveProperty('storageKey');
    expect(first).not.toHaveProperty('renderData');
    const second = await reports.generate(review.id, actor);
    expect(second.id).toBe(first.id);
    expect(storage.uploadPrivateImmutable).toHaveBeenCalledTimes(1);
    expect(await prisma.operationalReviewReport.count({ where: { operationalReviewId: review.id } })).toBe(1);
    const pdf = await reports.download(review.id, actor);
    expect(pdf.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    await expect(reports.download(review.id, { ...actor, organizationId: ids.otherOrganization })).rejects.toThrow();
    const record = await prisma.operationalReviewReport.findUniqueOrThrow({ where: { id: first.id } });
    expect(record.reportSha256).toBe(createHash('sha256').update(pdf.bytes).digest('hex'));
    expect(record.fileSize).toBe(pdf.bytes.length);
    const forbidden = new Set(['password', 'token', 'storageKey', 'clientIntentId', 'subscriberId', 'destinationSnapshot', 'providerMessageId', 'providerIdempotencyKey', 'createdById', 'submittedById', 'finalizedById']);
    const inspectKeys = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, nested] of Object.entries(value)) {
        expect(forbidden.has(key)).toBe(false);
        inspectKeys(nested);
      }
    };
    inspectKeys(record.renderData);
    objects.delete(record.storageKey);
    await expect(reports.download(review.id, actor)).rejects.toThrow('indisponible');
    objects.set(record.storageKey, pdf.bytes);
    objects.set(record.storageKey, Buffer.from('corrupted'));
    await expect(reports.download(review.id, actor)).rejects.toThrow('Intégrité');
    objects.set(record.storageKey, pdf.bytes);
    const limitedId = `review-limited-${suffix}`;
    await prisma.clientUser.create({ data: {
      id: limitedId, email: `review-limited-${suffix}@example.invalid`, password: 'not-used',
      firstName: 'Limited', lastName: 'Tester', buildingIds: [ids.building],
      clientId: ids.client, organizationId: ids.organization,
      operationalReviewPermissions: [OperationalReviewPermission.REX_EDIT],
    } });
    const limitedActor = { ...actor, sub: limitedId };
    expect((await reports.get(review.id, limitedActor))?.id).toBe(first.id);
    await expect(reports.generate(review.id, limitedActor)).rejects.toThrow('Permission REX requise');
    await expect(prisma.operationalReviewReport.update({ where: { id: first.id }, data: { fileSize: 1 } })).rejects.toThrow('immutable');
    await expect(prisma.operationalReviewReport.delete({ where: { id: first.id } })).rejects.toThrow('write-once');
    await expect(prisma.operationalReviewReport.create({ data: {
      organizationId: ids.otherOrganization, operationalReviewId: review.id, reviewVersion: review.version,
      reportVersion: 2, generatedAt: new Date(), generatedByType: CoroActorType.SYSTEM, generatedById: 'test',
      generatorVersion: 'test', storageKey: `test-${randomUUID()}`, leaseExpiresAt: new Date(), renderData: {},
    } })).rejects.toThrow();
    await expect(prisma.operationalReviewReport.create({ data: {
      organizationId: ids.organization, operationalReviewId: review.id, reviewVersion: review.version,
      reportVersion: 1, generatedAt: new Date(), generatedByType: CoroActorType.SYSTEM, generatedById: 'test',
      generatorVersion: 'test', storageKey: `test-${randomUUID()}`, leaseExpiresAt: new Date(), renderData: {},
    } })).rejects.toThrow();
  });

  it('supersede R1 par une unique R2 technique sans mutation historique', async () => {
    const review = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.event } });
    const source = await prisma.operationalReviewReport.findFirstOrThrow({ where: { operationalReviewId: review.id, reportVersion: 1 } });
    const before = { ...source };
    const objects = new Map<string, Buffer>();
    const storage = {
      uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
        if (objects.has(key)) throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
        objects.set(key, Buffer.from(bytes));
      }),
      downloadPrivate: jest.fn(async (key: string) => {
        const bytes = objects.get(key);
        if (!bytes) throw new Error('PRIVATE_OBJECT_NOT_FOUND');
        return Buffer.from(bytes);
      }),
    };
    const reports = new OperationalReviewReportService(prisma as any, storage as any, service);
    const reason = OperationalReviewReportSupersessionReason.TECHNICAL_CORRECTION;
    const call = () => reports.supersede(source.id, reason, 'Correction du rendu des polices embarquées du rapport PDF.', ids.user);
    const concurrent = await Promise.allSettled([call(), call()]);
    expect(concurrent.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const repeated = await call();
    expect(repeated.reportVersion).toBe(2);
    expect(repeated.generatorVersion).toBe(OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION);
    expect(await prisma.operationalReviewReport.count({ where: { operationalReviewId: review.id } })).toBe(2);
    expect(storage.uploadPrivateImmutable).toHaveBeenCalledTimes(1);
    const first = await prisma.operationalReviewReport.findUniqueOrThrow({ where: { id: source.id } });
    expect(first).toEqual(before);
    const second = await prisma.operationalReviewReport.findUniqueOrThrow({ where: { supersedesReportId: source.id } });
    expect(second.supersessionReason).toBe(reason);
    expect(second.supersessionComment).toContain('polices');
    expect(second.generatedByType).toBe(CoroActorType.USER);
    expect(second.generatedById).toBe(ids.user);
    expect(second.storageKey).not.toBe(source.storageKey);
    expect(second.reportSha256).not.toBe(source.reportSha256);
    const business = (value: any) => { const { generatedAt, generatedByType, reportVersion, ...rest } = value; return rest; };
    expect(business(second.renderData)).toEqual(business(source.renderData));
    expect((second.renderData as any).reportVersion).toBe(2);
    expect((second.renderData as any).generatedAt).toBe(second.generatedAt.toISOString());
    expect((await reports.get(review.id, actor))?.id).toBe(second.id);
    const current = await reports.download(review.id, actor);
    const historical = await reports.download(review.id, actor, 2);
    expect(current.bytes.equals(historical.bytes)).toBe(true);
    expect(await reports.list(review.id, actor)).toMatchObject([{ reportVersion: 2, isCurrent: true }, { reportVersion: 1, isCurrent: false }]);
    await expect(prisma.operationalReviewReport.update({ where: { id: source.id }, data: { fileSize: 1 } })).rejects.toThrow('immutable');
    await expect(prisma.operationalReviewReport.delete({ where: { id: source.id } })).rejects.toThrow('write-once');
    await expect(prisma.operationalReviewReport.update({ where: { id: second.id }, data: { fileSize: 1 } })).rejects.toThrow('immutable');
    await expect(prisma.operationalReviewReport.delete({ where: { id: second.id } })).rejects.toThrow('write-once');
    await expect(prisma.operationalReviewReport.create({ data: {
      organizationId: ids.otherOrganization, operationalReviewId: review.id, reviewVersion: review.version,
      reportVersion: 3, supersedesReportId: second.id, supersessionReason: reason, supersessionComment: 'Cross tenant',
      generatedAt: new Date(), generatedByType: CoroActorType.USER, generatedById: ids.user,
      generatorVersion: 'test', storageKey: `test-${randomUUID()}`, leaseExpiresAt: new Date(), renderData: {},
    } })).rejects.toThrow();
    const otherReview = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.secondEvent } });
    await expect(prisma.operationalReviewReport.create({ data: {
      organizationId: ids.organization, operationalReviewId: otherReview.id, reviewVersion: otherReview.version,
      reportVersion: 3, supersedesReportId: second.id, supersessionReason: reason, supersessionComment: 'Cross REX',
      generatedAt: new Date(), generatedByType: CoroActorType.USER, generatedById: ids.user,
      generatorVersion: 'test', storageKey: `test-${randomUUID()}`, leaseExpiresAt: new Date(), renderData: {},
    } })).rejects.toThrow();
  });

  it('reprend apres lease expiree sans second upload si le fichier prive correspond', async () => {
    const review = await prisma.operationalReview.findFirstOrThrow({ where: { populationOperationalEventId: ids.secondEvent } });
    const bytes = Buffer.from('%PDF-1.7\nrecovery-test', 'utf8');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const storageKey = `operational-review-reports/${ids.organization}/${review.id}/${randomUUID()}/recovery.pdf`;
    const record = await prisma.operationalReviewReport.create({ data: {
      organizationId: ids.organization, operationalReviewId: review.id, reviewVersion: review.version,
      reportVersion: 1, generatedAt: new Date(), generatedByType: CoroActorType.CLIENT_USER,
      generatedById: ids.user, generatorVersion: 'coro-rex-pdf/1.0.0', storageKey,
      leaseExpiresAt: new Date(Date.now() - 1000), renderData: { test: true },
      reportSha256: hash, fileSize: bytes.length,
    } });
    const storage = {
      uploadPrivateImmutable: jest.fn(),
      downloadPrivate: jest.fn(async () => Buffer.from(bytes)),
    };
    const reports = new OperationalReviewReportService(prisma as any, storage as any, service);
    const result = await reports.generate(review.id, actor);
    expect(result.id).toBe(record.id);
    expect(result.status).toBe('FINALIZED');
    expect(storage.downloadPrivate).toHaveBeenCalledTimes(1);
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
  });

  it('reprend R2 après upload privé sans second PUT', async () => {
    const source = await prisma.operationalReviewReport.findFirstOrThrow({ where: { reportVersion: 1, operationalReview: { populationOperationalEventId: ids.secondEvent } } });
    const bytes = Buffer.from('%PDF-1.7\nprivate-r2-recovery', 'utf8');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const report = await prisma.operationalReviewReport.create({ data: {
      organizationId: ids.organization, operationalReviewId: source.operationalReviewId,
      reviewVersion: source.reviewVersion, reportVersion: 2, language: 'FR', format: 'PDF',
      supersedesReportId: source.id, supersessionReason: OperationalReviewReportSupersessionReason.TECHNICAL_CORRECTION,
      supersessionComment: 'Correction technique de test', generatedAt: new Date(),
      generatedByType: CoroActorType.USER, generatedById: ids.user,
      generatorVersion: 'coro-rex-pdf/1.0.1', storageKey: `test-${randomUUID()}`,
      leaseExpiresAt: new Date(Date.now() - 1000), renderData: source.renderData as any,
      reportSha256: hash, fileSize: bytes.length,
    } });
    const storage = { uploadPrivateImmutable: jest.fn(), downloadPrivate: jest.fn(async () => Buffer.from(bytes)) };
    const reports = new OperationalReviewReportService(prisma as any, storage as any, service);
    const result = await reports.supersede(source.id, OperationalReviewReportSupersessionReason.TECHNICAL_CORRECTION, 'Correction technique de test', ids.user);
    expect(result.id).toBe(report.id);
    expect(result.status).toBe('FINALIZED');
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect(storage.downloadPrivate).toHaveBeenCalledTimes(1);
  });
});
