import { CoroActorType, CorrectiveActionEvidenceType, CorrectiveActionPermission, OperationalReviewConfidentiality, OperationalReviewPermission, OperationalReviewStatus, PopulationDeliveryMode, PopulationOperationalEventStatus, PopulationProgramStatus, PrismaClient, ReviewFindingCategory, ReviewFindingSeverity, ReviewRecommendationStatus, RueAssessmentStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { OperationalReviewsService } from '../src/operational-reviews/operational-reviews.service';
import { CorrectiveActionTrackingReportService } from '../src/operational-reviews/corrective-action-tracking-report.service';
import { CorrectiveActionTrackingPdfService } from '../src/operational-reviews/corrective-action-tracking-pdf.service';
import { CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION, TrackingRenderData } from '../src/operational-reviews/corrective-action-tracking-report.renderer';

const url = process.env.TEST_DATABASE_URL;
if (process.env.CI && !url) throw new Error('TEST_DATABASE_URL est obligatoire en CI');
const describePostgres = url ? describe : describe.skip;

describePostgres('Corrective Action Tracking PostgreSQL', () => {
  const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
  const suffix = randomUUID();
  const ids = { org: `tracking-org-${suffix}`, otherOrg: `tracking-other-${suffix}`, client: `tracking-client-${suffix}`, building: `tracking-building-${suffix}`, user: `tracking-user-${suffix}`, profile: `tracking-profile-${suffix}`, program: `tracking-program-${suffix}`, scenario: `tracking-scenario-${suffix}`, event: `tracking-event-${suffix}` };
  const actor = { sub: ids.user, organizationId: ids.org, clientId: ids.client, role: 'CLIENT_MANAGER', buildingIds: [ids.building] };
  const service = new CorrectiveActionTrackingReportService(prisma as any, new OperationalReviewsService(prisma as any));
  const objects = new Map<string, Buffer>();
  const storage = {
    uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
      if (objects.has(key)) throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
      objects.set(key, Buffer.from(bytes)); return { storageKey: key };
    }),
    downloadPrivate: jest.fn(async (key: string) => {
      const bytes = objects.get(key); if (!bytes) throw new Error('PRIVATE_OBJECT_NOT_FOUND'); return Buffer.from(bytes);
    }),
  };
  const pdfService = new CorrectiveActionTrackingPdfService(prisma as any, storage as any, service);
  let reviewId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({ data: [{ id: ids.org, name: 'Tracking test' }, { id: ids.otherOrg, name: 'Other' }] });
    await prisma.client.create({ data: { id: ids.client, name: 'Tracking client', organizationId: ids.org, regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: ids.building, name: 'Tracking building', address: 'Test', city: 'Test', province: 'QC', organizationId: ids.org, clientId: ids.client } });
    await prisma.clientUser.create({ data: { id: ids.user, organizationId: ids.org, clientId: ids.client, email: `tracking-${suffix}@example.invalid`, password: 'unused', firstName: 'Test', lastName: 'User', buildingIds: [ids.building], operationalReviewPermissions: Object.values(OperationalReviewPermission), correctiveActionPermissions: [CorrectiveActionPermission.CORRECTIVE_ACTION_REPORT_GENERATE] } });
    await prisma.rueFacilityProfile.create({ data: { id: ids.profile, buildingId: ids.building, assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT, populationEnabled: true } });
    await prisma.populationProgram.create({ data: { id: ids.program, rueFacilityProfileId: ids.profile, status: PopulationProgramStatus.ACTIVE, deliveryMode: PopulationDeliveryMode.SANDBOX, publicSlug: `tracking-${suffix}`, nameFR: 'Test program' } });
    await prisma.rueEmergencyScenario.create({ data: { id: ids.scenario, facilityProfileId: ids.profile, nameFR: 'Scenario' } });
    await prisma.populationOperationalEvent.create({ data: { id: ids.event, organizationId: ids.org, programId: ids.program, emergencyScenarioId: ids.scenario, status: PopulationOperationalEventStatus.ENDED, startedByType: CoroActorType.SYSTEM, startedById: 'test', endedByType: CoroActorType.SYSTEM, endedById: 'test', endedAt: new Date() } });
    const review = await prisma.operationalReview.create({ data: { organizationId: ids.org, buildingId: ids.building, populationOperationalEventId: ids.event, title: 'Tracking', status: OperationalReviewStatus.IN_REVIEW, createdByType: CoroActorType.CLIENT_USER, createdById: ids.user } });
    reviewId = review.id;
    const finding = await prisma.reviewFinding.create({ data: { organizationId: ids.org, operationalReviewId: reviewId, category: ReviewFindingCategory.OBSERVATION, title: 'Finding', description: 'Test', severity: ReviewFindingSeverity.LOW, displayOrder: 1, createdByType: CoroActorType.CLIENT_USER, createdById: ids.user } });
    const recommendation = await prisma.reviewRecommendation.create({ data: { organizationId: ids.org, operationalReviewId: reviewId, reviewFindingId: finding.id, description: 'Recommendation', status: ReviewRecommendationStatus.ACCEPTED, displayOrder: 1, createdByType: CoroActorType.CLIENT_USER, createdById: ids.user } });
    const action = await prisma.correctiveAction.create({ data: { organizationId: ids.org, buildingId: ids.building, reviewRecommendationId: recommendation.id, title: 'Cancelled action', category: 'GENERAL', status: 'CANCELLED', visibility: OperationalReviewConfidentiality.RESTRICTED } });
    await prisma.correctiveActionEvidence.createMany({ data: [
      { organizationId: ids.org, correctiveActionId: action.id, clientIntentId: randomUUID(), type: CorrectiveActionEvidenceType.NOTE, title: 'Note active', status: 'ACTIVE', noteText: 'PRIVATE_NOTE', submittedByType: CoroActorType.CLIENT_USER, submittedById: ids.user },
      { organizationId: ids.org, correctiveActionId: action.id, clientIntentId: randomUUID(), type: CorrectiveActionEvidenceType.LINK, title: 'Lien retire', status: 'WITHDRAWN', externalUrl: 'https://example.invalid/PRIVATE_LINK', submittedByType: CoroActorType.CLIENT_USER, submittedById: ids.user, withdrawnAt: new Date(), withdrawnByType: CoroActorType.CLIENT_USER, withdrawnById: ids.user, withdrawalReason: 'Retire' },
      { organizationId: ids.org, correctiveActionId: action.id, clientIntentId: randomUUID(), type: CorrectiveActionEvidenceType.NOTE, title: 'En attente', status: 'PENDING', noteText: 'PRIVATE_PENDING', submittedByType: CoroActorType.CLIENT_USER, submittedById: ids.user },
    ] });
    await prisma.correctiveActionVerification.createMany({ data: [
      { organizationId: ids.org, correctiveActionId: action.id, clientIntentId: randomUUID(), attemptNumber: 1, verdict: 'REJECTED', comment: 'A reprendre', verifiedByType: CoroActorType.CLIENT_USER, verifiedById: ids.user },
      { organizationId: ids.org, correctiveActionId: action.id, clientIntentId: randomUUID(), attemptNumber: 2, verdict: 'ACCEPTED', verifiedByType: CoroActorType.CLIENT_USER, verifiedById: ids.user },
    ] });
    await prisma.operationalReview.update({ where: { id: reviewId }, data: { status: OperationalReviewStatus.FINALIZED, finalizedAt: new Date() } });
  });
  afterAll(async () => prisma.$disconnect());

  it('capture, rejoue et alloue deux versions concurrentes sans collision', async () => {
    const intent = randomUUID();
    const [first, replay] = await Promise.all([service.create(reviewId, intent, actor), service.create(reviewId, intent, actor)]);
    expect(first.reportVersion).toBe(replay.reportVersion);
    expect(first).toMatchObject({ reportVersion: 1, status: 'SNAPSHOT_READY', actionCount: 1 });
    const [second, third] = await Promise.all([service.create(reviewId, randomUUID(), actor), service.create(reviewId, randomUUID(), actor)]);
    expect([second.reportVersion, third.reportVersion].sort()).toEqual([2, 3]);
    expect(await prisma.correctiveActionTrackingReport.count({ where: { operationalReviewId: reviewId } })).toBe(3);
  });

  it('protege le snapshot, la version et le tenant en base', async () => {
    const record = await prisma.correctiveActionTrackingReport.findFirstOrThrow({ where: { operationalReviewId: reviewId } });
    expect((record.renderData as any).actions[0].status).toBe('CANCELLED');
    expect((record.renderData as any).actions[0].evidence).toHaveLength(1);
    expect((record.renderData as any).actions[0].withdrawnEvidenceCount).toBe(1);
    expect((record.renderData as any).actions[0].verifications.map((item: any) => item.verdict)).toEqual(['REJECTED', 'ACCEPTED']);
    expect(JSON.stringify(record.renderData)).not.toMatch(/PRIVATE_NOTE|PRIVATE_LINK|PRIVATE_PENDING|storageKey|verifiedById/);
    await expect(prisma.correctiveActionTrackingReport.update({ where: { id: record.id }, data: { renderData: { changed: true } } })).rejects.toThrow();
    await expect(prisma.correctiveActionTrackingReport.update({ where: { id: record.id }, data: { reportVersion: 99 } })).rejects.toThrow();
    await expect(prisma.correctiveActionTrackingReport.delete({ where: { id: record.id } })).rejects.toThrow();
    await expect(prisma.correctiveActionTrackingReport.create({ data: { organizationId: ids.otherOrg, operationalReviewId: reviewId, reviewVersion: 1, reportVersion: 99, clientIntentId: randomUUID(), snapshotAt: new Date(), generatedByType: CoroActorType.CLIENT_USER, generatedById: ids.user, renderData: {} } })).rejects.toThrow();
  });

  it('materialise R1 depuis le snapshot, sans relire une action modifiee, puis rejoue sans second upload', async () => {
    const before = await prisma.correctiveActionTrackingReport.findFirstOrThrow({ where: { operationalReviewId: reviewId, reportVersion: 1 } });
    const titleAtSnapshot = (before.renderData as any).actions[0].title;
    const action = await prisma.correctiveAction.findFirstOrThrow({ where: { reviewRecommendation: { operationalReviewId: reviewId } } });
    await prisma.correctiveAction.update({ where: { id: action.id }, data: { title: 'Changed after snapshot' } });
    const spy = jest.spyOn((pdfService as any).renderer, 'render');
    const first = await pdfService.materialize(reviewId, 1, actor);
    expect(first).toMatchObject({ status: 'FINALIZED', reportVersion: 1, actionCount: 1 });
    expect((spy.mock.calls[0][0] as TrackingRenderData).actions[0].title).toBe(titleAtSnapshot);
    expect((spy.mock.calls[0][0] as TrackingRenderData).actions[0].title).not.toBe('Changed after snapshot');
    spy.mockRestore();
    const record = await prisma.correctiveActionTrackingReport.findFirstOrThrow({ where: { operationalReviewId: reviewId, reportVersion: 1 } });
    expect(record.snapshotCreatedById).toBe(ids.user);
    expect(record.generatedById).toBe(ids.user);
    expect(record.storageKey).toContain(`/${ids.org}/${reviewId}/${record.id}/REX-`);
    expect(record.reportSha256).toMatch(/^[0-9a-f]{64}$/);
    const uploaded = storage.uploadPrivateImmutable.mock.calls.length;
    const replay = await pdfService.materialize(reviewId, 1, actor);
    expect(replay).toEqual(first);
    expect(storage.uploadPrivateImmutable).toHaveBeenCalledTimes(uploaded);
    const download = await pdfService.download(reviewId, 1, actor);
    expect(download.bytes.length).toBe(record.fileSize);
    expect(createHash('sha256').update(download.bytes).digest('hex')).toBe(record.reportSha256);
    await expect(prisma.correctiveActionTrackingReport.update({ where: { id: record.id }, data: { fileSize: 1 } })).rejects.toThrow();
    await expect(prisma.correctiveActionTrackingReport.delete({ where: { id: record.id } })).rejects.toThrow();
  }, 20000);

  it('reprend GENERATING apres upload sans second PUT et refuse un objet divergent', async () => {
    const second = await prisma.correctiveActionTrackingReport.findFirstOrThrow({ where: { operationalReviewId: reviewId, reportVersion: 2 } });
    const key = `corrective-action-tracking-reports/${ids.org}/${reviewId}/${second.id}/recovery.pdf`;
    const generatedAt = new Date();
    const bytes = await (pdfService as any).renderer.render(second.renderData as TrackingRenderData, { reportVersion: 2, generatedAt: generatedAt.toISOString(), generatedByType: CoroActorType.CLIENT_USER, generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION });
    const digest = createHash('sha256').update(bytes).digest('hex');
    await prisma.correctiveActionTrackingReport.update({ where: { id: second.id }, data: { status: 'GENERATING', snapshotCreatedByType: second.generatedByType, snapshotCreatedById: second.generatedById, generatedAt, generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION, storageKey: key, leaseExpiresAt: new Date(Date.now() - 1000), reportSha256: digest, fileSize: bytes.length } });
    objects.set(key, bytes);
    const uploads = storage.uploadPrivateImmutable.mock.calls.length;
    await expect(pdfService.materialize(reviewId, 2, actor)).resolves.toMatchObject({ status: 'FINALIZED', reportVersion: 2 });
    expect(storage.uploadPrivateImmutable).toHaveBeenCalledTimes(uploads);

    const third = await prisma.correctiveActionTrackingReport.findFirstOrThrow({ where: { operationalReviewId: reviewId, reportVersion: 3 } });
    const badKey = `corrective-action-tracking-reports/${ids.org}/${reviewId}/${third.id}/divergent.pdf`;
    await prisma.correctiveActionTrackingReport.update({ where: { id: third.id }, data: { status: 'GENERATING', snapshotCreatedByType: third.generatedByType, snapshotCreatedById: third.generatedById, generatedAt: new Date(), generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION, storageKey: badKey, leaseExpiresAt: new Date(Date.now() - 1000), reportSha256: digest, fileSize: bytes.length } });
    objects.set(badKey, Buffer.from('wrong'));
    await expect(pdfService.materialize(reviewId, 3, actor)).rejects.toThrow();
    expect((await prisma.correctiveActionTrackingReport.findUniqueOrThrow({ where: { id: third.id } })).status).toBe('GENERATING');
  }, 20000);

  it('refuse telechargement apres revocation acces batiment, meme si FINALIZED', async () => {
    await expect(pdfService.download(reviewId, 1, { ...actor, buildingIds: ['other-building'] })).rejects.toThrow();
  });
});
