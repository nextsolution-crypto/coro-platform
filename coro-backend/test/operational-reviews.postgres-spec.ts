import {
  CoroActorType,
  OperationalReviewConfidentiality,
  OperationalReviewPermission,
  OperationalReviewStatus,
  PopulationDeliveryMode,
  PopulationOperationalEventStatus,
  PopulationProgramStatus,
  PrismaClient,
  RueAssessmentStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { OperationalReviewsService } from '../src/operational-reviews/operational-reviews.service';

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
    await prisma.populationOperationalEvent.createMany({ data: [ids.event, ids.secondEvent].map((id) => ({ id, organizationId: ids.organization, programId: ids.program, emergencyScenarioId: ids.scenario, status: PopulationOperationalEventStatus.ENDED, startedByType: CoroActorType.SYSTEM, startedById: 'postgres-test', endedByType: CoroActorType.SYSTEM, endedById: 'postgres-test', endedAt: new Date() })) });
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
});
