import { CoroActorType, OperationalReviewPermission, PopulationDeliveryMode, PopulationOperationalEventStatus, PopulationProgramStatus, PrismaClient, RueAssessmentStatus, ReviewFindingCategory, ReviewFindingSeverity, ReviewRecommendationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OperationalReviewsService } from '../src/operational-reviews/operational-reviews.service';
import { CorrectiveActionsService } from '../src/occupancy/corrective-actions.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error('TEST_DATABASE_URL est obligatoire en CI');
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('CorrectiveAction D1 PostgreSQL invariants', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const reviews = new OperationalReviewsService(prisma as any);
  const actions = new CorrectiveActionsService(prisma as any);
  const suffix = randomUUID();
  const ids = { org: `ac-org-${suffix}`, otherOrg: `ac-other-${suffix}`, client: `ac-client-${suffix}`, building: `ac-building-${suffix}`, profile: `ac-profile-${suffix}`, program: `ac-program-${suffix}`, scenario: `ac-scenario-${suffix}`, event: `ac-event-${suffix}`, user: `ac-user-${suffix}` };
  const actor = { sub: ids.user, organizationId: ids.org, clientId: ids.client, role: 'CLIENT_MANAGER', buildingIds: [ids.building] };
  let reviewId: string;
  let recommendationId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({ data: [{ id: ids.org, name: 'AC tests' }, { id: ids.otherOrg, name: 'Other' }] });
    await prisma.client.create({ data: { id: ids.client, name: 'AC client', organizationId: ids.org, regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: ids.building, name: 'AC building', address: 'Test', city: 'Test', province: 'QC', organizationId: ids.org, clientId: ids.client } });
    await prisma.clientUser.create({ data: { id: ids.user, email: `ac-${suffix}@example.invalid`, password: 'unused', firstName: 'Alex', lastName: 'Test', buildingIds: [ids.building], clientId: ids.client, organizationId: ids.org, operationalReviewPermissions: Object.values(OperationalReviewPermission), correctiveActionPermissions: [] } });
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
});
