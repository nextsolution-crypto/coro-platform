import { CoroActorType, CorrectiveActionPermission, OperationalReviewPermission, PopulationDeliveryMode, PopulationOperationalEventStatus, PopulationProgramStatus, PrismaClient, RueAssessmentStatus, ReviewFindingCategory, ReviewFindingSeverity, ReviewRecommendationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OperationalReviewsService } from '../src/operational-reviews/operational-reviews.service';
import { CorrectiveActionsService } from '../src/occupancy/corrective-actions.service';
import { CorrectiveActionEvidenceService } from '../src/occupancy/corrective-action-evidence.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error('TEST_DATABASE_URL est obligatoire en CI');
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('CorrectiveAction D1 PostgreSQL invariants', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const reviews = new OperationalReviewsService(prisma as any);
  const actions = new CorrectiveActionsService(prisma as any);
  const storage = { downloadPrivate: jest.fn(), uploadPrivateImmutable: jest.fn() };
  const evidence = new CorrectiveActionEvidenceService(prisma as any, storage as any, actions);
  const suffix = randomUUID();
  const ids = { org: `ac-org-${suffix}`, otherOrg: `ac-other-${suffix}`, client: `ac-client-${suffix}`, building: `ac-building-${suffix}`, profile: `ac-profile-${suffix}`, program: `ac-program-${suffix}`, scenario: `ac-scenario-${suffix}`, event: `ac-event-${suffix}`, user: `ac-user-${suffix}`, verifier: `ac-verifier-${suffix}`, denied: `ac-denied-${suffix}` };
  const actor = { sub: ids.user, organizationId: ids.org, clientId: ids.client, role: 'CLIENT_MANAGER', buildingIds: [ids.building] };
  const verifier = { ...actor, sub: ids.verifier };
  const deniedActor = { ...actor, sub: ids.denied };
  let reviewId: string;
  let recommendationId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({ data: [{ id: ids.org, name: 'AC tests' }, { id: ids.otherOrg, name: 'Other' }] });
    await prisma.client.create({ data: { id: ids.client, name: 'AC client', organizationId: ids.org, regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: ids.building, name: 'AC building', address: 'Test', city: 'Test', province: 'QC', organizationId: ids.org, clientId: ids.client } });
    await prisma.clientUser.create({ data: { id: ids.user, email: `ac-${suffix}@example.invalid`, password: 'unused', firstName: 'Alex', lastName: 'Test', buildingIds: [ids.building], clientId: ids.client, organizationId: ids.org, operationalReviewPermissions: Object.values(OperationalReviewPermission), correctiveActionPermissions: [CorrectiveActionPermission.CORRECTIVE_ACTION_CREATE, CorrectiveActionPermission.CORRECTIVE_ACTION_EDIT, CorrectiveActionPermission.CORRECTIVE_ACTION_COMPLETE] } });
    await prisma.clientUser.create({ data: { id: ids.verifier, email: `verify-${suffix}@example.invalid`, password: 'unused', firstName: 'Vera', lastName: 'Test', buildingIds: [ids.building], clientId: ids.client, organizationId: ids.org, correctiveActionPermissions: [CorrectiveActionPermission.CORRECTIVE_ACTION_VERIFY, CorrectiveActionPermission.CORRECTIVE_ACTION_CLOSE] } });
    await prisma.clientUser.create({ data: { id: ids.denied, email: `denied-${suffix}@example.invalid`, password: 'unused', firstName: 'No', lastName: 'Permission', buildingIds: [ids.building], clientId: ids.client, organizationId: ids.org, correctiveActionPermissions: [] } });
    await prisma.rueFacilityProfile.create({ data: { id: ids.profile, buildingId: ids.building, assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT, populationEnabled: true } });
    await prisma.populationProgram.create({ data: { id: ids.program, rueFacilityProfileId: ids.profile, status: PopulationProgramStatus.ACTIVE, deliveryMode: PopulationDeliveryMode.SANDBOX, publicSlug: `ac-${suffix}`, nameFR: 'AC program' } });
    await prisma.rueEmergencyScenario.create({ data: { id: ids.scenario, facilityProfileId: ids.profile, nameFR: 'AC scenario' } });
    await prisma.populationOperationalEvent.create({ data: { id: ids.event, organizationId: ids.org, programId: ids.program, emergencyScenarioId: ids.scenario, status: PopulationOperationalEventStatus.ENDED, startedByType: CoroActorType.SYSTEM, startedById: 'test', endedByType: CoroActorType.SYSTEM, endedById: 'test', endedAt: new Date() } });
    const review = await reviews.create({ title: 'AC source', populationOperationalEventId: ids.event }, actor);
    reviewId = review.id;
    const finding = await reviews.createFinding(reviewId, { category: ReviewFindingCategory.GAP, title: 'Gap', description: 'Gap', severity: ReviewFindingSeverity.HIGH }, actor);
    const recommendation = await reviews.createRecommendation(reviewId, finding.id, { description: 'Improve' }, actor);
    recommendationId = recommendation.id;
    await reviews.submit(reviewId, actor);
    await reviews.decideRecommendation(reviewId, recommendationId, { status: ReviewRecommendationStatus.ACCEPTED }, actor);
  });
  afterAll(async () => prisma.$disconnect());

  it('refuse une mutation a un ClientUser sans permission explicite', async () => {
    await expect(actions.create({ title: 'Forbidden', buildingId: ids.building }, deniedActor)).rejects.toThrow('Permission action corrective requise');
    await expect(prisma.correctiveAction.count({ where: { title: 'Forbidden', organizationId: ids.org } })).resolves.toBe(0);
  });

  it('conserve une action legacy sans reference et genere les nouvelles references', async () => {
    const legacy = await prisma.correctiveAction.create({ data: { organizationId: ids.org, buildingId: ids.building, category: 'GENERAL', title: 'Legacy', reference: null } });
    expect(legacy.reference).toBeNull();
    const fresh = await actions.create({ title: 'Fresh', buildingId: ids.building }, actor);
    expect(fresh.reference).toMatch(/^AC-\d{4}-\d{6}$/);
  });

  it('permet plusieurs actions par Recommendation avec intentions distinctes', async () => {
    const first = await actions.createFromRecommendation(reviewId, recommendationId, { title: 'A', clientIntentId: randomUUID() }, actor);
    const second = await actions.createFromRecommendation(reviewId, recommendationId, { title: 'B', clientIntentId: randomUUID() }, actor);
    expect(second.id).not.toBe(first.id);
    expect(await prisma.correctiveAction.count({ where: { reviewRecommendationId: recommendationId } })).toBe(2);
  });

  it('rend une meme intention concurrente idempotente', async () => {
    const clientIntentId = randomUUID();
    const create = () => actions.createFromRecommendation(reviewId, recommendationId, { title: 'Retry', clientIntentId }, actor);
    const [first, second] = await Promise.all([create(), create()]);
    expect(second.id).toBe(first.id);
    expect(await prisma.correctiveAction.count({ where: { clientIntentId } })).toBe(1);
  });

  it('garantit le tenant de la Recommendation par FK composite', async () => {
    await expect(prisma.correctiveAction.create({ data: { organizationId: ids.otherOrg, buildingId: ids.building, category: 'GENERAL', title: 'Cross tenant', reviewRecommendationId: recommendationId } })).rejects.toThrow();
  });

  it('rend l audit append-only', async () => {
    const event = await prisma.correctiveActionAuditEvent.findFirstOrThrow({ where: { organizationId: ids.org } });
    await expect(prisma.correctiveActionAuditEvent.update({ where: { id: event.id }, data: { metadata: { changed: true } } })).rejects.toThrow('append-only');
    await expect(prisma.correctiveActionAuditEvent.delete({ where: { id: event.id } })).rejects.toThrow('append-only');
  });

  it('annule sans DELETE physique et preserve les relations legacy nullable', async () => {
    const action = await actions.create({ title: 'Cancel', buildingId: ids.building }, actor);
    await actions.delete(action.id, actor);
    await expect(prisma.correctiveAction.findUniqueOrThrow({ where: { id: action.id } })).resolves.toMatchObject({ status: 'CANCELLED', buildingId: ids.building });
  });

  it('cree une preuve NOTE idempotente puis complete avec acteur', async () => {
    const action = await actions.create({ title: 'Completion', buildingId: ids.building }, actor);
    await actions.update(action.id, { status: 'IN_PROGRESS' }, actor);
    const clientIntentId = randomUUID();
    const first = await evidence.addNote(action.id, { clientIntentId, title: 'Compte rendu', noteText: 'Travaux realises' }, actor);
    const replay = await evidence.addNote(action.id, { clientIntentId, title: 'Compte rendu', noteText: 'Travaux realises' }, actor);
    expect(replay.id).toBe(first.id);
    const completed = await actions.complete(action.id, {}, actor);
    expect(completed).toMatchObject({ status: 'COMPLETED' });
    for (const field of ['completedById', 'verifiedById', 'closedById', 'createdById', 'updatedById', 'clientIntentId', 'reviewRecommendationId', 'organizationId', 'storageKey']) {
      expect(completed).not.toHaveProperty(field);
    }
    const persisted = await prisma.correctiveAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(persisted).toMatchObject({
      status: 'COMPLETED',
      completedByType: CoroActorType.CLIENT_USER,
      completedById: ids.user,
    });
    expect(persisted.completedAt).not.toBeNull();
  });

  it('impose les invariants de type Evidence en PostgreSQL', async () => {
    const action = await actions.create({ title: 'Checks', buildingId: ids.building }, actor);
    await expect(prisma.correctiveActionEvidence.create({ data: { organizationId: ids.org, correctiveActionId: action.id, clientIntentId: randomUUID(), type: 'NOTE', title: 'Invalid', status: 'ACTIVE', submittedByType: CoroActorType.CLIENT_USER, submittedById: ids.user } })).rejects.toThrow();
  });

  it('interdit mutation de contenu et DELETE mais autorise ACTIVE vers WITHDRAWN', async () => {
    const action = await actions.create({ title: 'Immutable', buildingId: ids.building }, actor);
    const created = await evidence.addNote(action.id, { clientIntentId: randomUUID(), title: 'Initial', noteText: 'Texte immuable' }, actor);
    await expect(prisma.correctiveActionEvidence.update({ where: { id: created.id }, data: { noteText: 'Modifie' } })).rejects.toThrow('immutable');
    await evidence.withdraw(action.id, created.id, { withdrawalReason: 'Remplacee' }, actor);
    await expect(prisma.correctiveActionEvidence.delete({ where: { id: created.id } })).rejects.toThrow('append-only');
  });

  it('refuse la completion sans preuve active ni commentaire', async () => {
    const action = await actions.create({ title: 'No justification', buildingId: ids.building }, actor);
    await actions.update(action.id, { status: 'IN_PROGRESS' }, actor);
    await expect(actions.complete(action.id, {}, actor)).rejects.toThrow('preuve active ou un commentaire');
    await expect(actions.complete(action.id, { completionComment: 'Realisation declaree' }, actor)).resolves.toMatchObject({ status: 'COMPLETED' });
  });

  it('conserve les tentatives REJECTED puis ACCEPTED et ferme idempotemment', async () => {
    const action = await actions.create({ title: 'Verify lifecycle', buildingId: ids.building }, actor);
    await actions.update(action.id, { status: 'IN_PROGRESS' }, actor);
    await actions.complete(action.id, { completionComment: 'Premiere realisation' }, actor);
    await actions.verify(action.id, { clientIntentId: randomUUID(), verdict: 'REJECTED', comment: 'Correction requise' }, verifier);
    await actions.complete(action.id, { completionComment: 'Correction apportee' }, actor);
    await actions.verify(action.id, { clientIntentId: randomUUID(), verdict: 'ACCEPTED', comment: 'Verification satisfaisante' }, verifier);
    const history = await actions.getVerifications(action.id, verifier);
    expect(history.map((item) => [item.attemptNumber, item.verdict])).toEqual([[1, 'REJECTED'], [2, 'ACCEPTED']]);
    const firstClose = await actions.close(action.id, { closureComment: 'Dossier ferme' }, verifier);
    const secondClose = await actions.close(action.id, { closureComment: 'Ne doit pas reecrire' }, verifier);
    expect(secondClose.closedAt).toEqual(firstClose.closedAt);
    expect(secondClose.closureComment).toBe('Dossier ferme');
  });

  it('rend Verification et action CLOSED immuables et fige Evidence', async () => {
    const action = await actions.create({ title: 'Immutable D3', buildingId: ids.building }, actor);
    await actions.update(action.id, { status: 'IN_PROGRESS' }, actor);
    const note = await evidence.addNote(action.id, { clientIntentId: randomUUID(), title: 'Preuve', noteText: 'Realise' }, actor);
    await actions.complete(action.id, {}, actor);
    await actions.verify(action.id, { clientIntentId: randomUUID(), verdict: 'ACCEPTED' }, verifier);
    await expect(prisma.correctiveActionEvidence.update({ where: { id: note.id }, data: { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawnByType: CoroActorType.CLIENT_USER, withdrawnById: ids.user, withdrawalReason: 'Non permis' } })).rejects.toThrow('frozen');
    const verification = await prisma.correctiveActionVerification.findFirstOrThrow({ where: { correctiveActionId: action.id } });
    await expect(prisma.correctiveActionVerification.update({ where: { id: verification.id }, data: { comment: 'Mutation' } })).rejects.toThrow('append-only');
    await expect(prisma.correctiveActionVerification.delete({ where: { id: verification.id } })).rejects.toThrow('append-only');
    await actions.close(action.id, {}, verifier);
    await expect(prisma.correctiveAction.update({ where: { id: action.id }, data: { title: 'Mutation' } })).rejects.toThrow('immutable');
  });

  it('serialize deux verdicts concurrents et deux fermetures', async () => {
    const action = await actions.create({ title: 'Concurrent D3', buildingId: ids.building }, actor);
    await actions.update(action.id, { status: 'IN_PROGRESS' }, actor);
    await actions.complete(action.id, { completionComment: 'Realise' }, actor);
    const results = await Promise.allSettled([
      actions.verify(action.id, { clientIntentId: randomUUID(), verdict: 'ACCEPTED', comment: 'OK' }, verifier),
      actions.verify(action.id, { clientIntentId: randomUUID(), verdict: 'REJECTED', comment: 'Non' }, verifier),
    ]);
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.correctiveActionVerification.count({ where: { correctiveActionId: action.id } })).toBe(1);
    const current = await prisma.correctiveAction.findUniqueOrThrow({ where: { id: action.id } });
    if (current.status === 'VERIFIED') {
      const [a, b] = await Promise.all([actions.close(action.id, {}, verifier), actions.close(action.id, {}, verifier)]);
      expect(a.closedAt).toEqual(b.closedAt);
    }
  });

  it('fige les nouveaux engagements mais laisse vivre les actions deja liees', async () => {
    const existing = await prisma.correctiveAction.findFirstOrThrow({ where: { reviewRecommendationId: recommendationId, status: 'PLANNED' } });
    await reviews.finalize(reviewId, actor);
    await expect(actions.createFromRecommendation(reviewId, recommendationId, { title: 'Trop tard', clientIntentId: randomUUID() }, actor)).rejects.toThrow('Le REX est finalisé');
    await expect(prisma.correctiveAction.create({ data: { organizationId: ids.org, buildingId: ids.building, category: 'GENERAL', title: 'Direct late', reviewRecommendationId: recommendationId } })).rejects.toThrow('cannot receive new CorrectiveAction');
    await expect(actions.update(existing.id, { status: 'IN_PROGRESS' }, actor)).resolves.toMatchObject({ status: 'IN_PROGRESS' });
    await expect(prisma.correctiveAction.update({ where: { id: existing.id }, data: { reviewRecommendationId: null } })).rejects.toThrow('action link is immutable');
  });

  it('serialize finalize et creation sans ajout retroactif', async () => {
    const eventId = `race-event-${suffix}`;
    await prisma.populationOperationalEvent.create({ data: { id: eventId, organizationId: ids.org, programId: ids.program, emergencyScenarioId: ids.scenario, status: PopulationOperationalEventStatus.ENDED, startedByType: CoroActorType.SYSTEM, startedById: 'test', endedByType: CoroActorType.SYSTEM, endedById: 'test', endedAt: new Date() } });
    const review = await reviews.create({ title: 'Race', populationOperationalEventId: eventId }, actor);
    const finding = await reviews.createFinding(review.id, { category: ReviewFindingCategory.GAP, title: 'Race', description: 'Test', severity: ReviewFindingSeverity.HIGH }, actor);
    const recommendation = await reviews.createRecommendation(review.id, finding.id, { description: 'Fix' }, actor);
    await reviews.submit(review.id, actor);
    await reviews.decideRecommendation(review.id, recommendation.id, { status: ReviewRecommendationStatus.ACCEPTED }, actor);
    const results = await Promise.allSettled([
      reviews.finalize(review.id, actor),
      actions.createFromRecommendation(review.id, recommendation.id, { title: 'Concurrent action', clientIntentId: randomUUID() }, actor),
    ]);
    expect(results[0].status).toBe('fulfilled');
    const count = await prisma.correctiveAction.count({ where: { reviewRecommendationId: recommendation.id } });
    expect(count).toBe(results[1].status === 'fulfilled' ? 1 : 0);
    expect(await prisma.operationalReview.findUniqueOrThrow({ where: { id: review.id } })).toMatchObject({ status: 'FINALIZED' });
    await expect(actions.createFromRecommendation(review.id, recommendation.id, { title: 'After race', clientIntentId: randomUUID() }, actor)).rejects.toThrow('Le REX est finalisé');
  });
});
