import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

async function expectDatabaseConstraint(promise: Promise<unknown>, pgCode: string, constraint: string) {
  try {
    await promise;
    throw new Error(`Expected PostgreSQL constraint ${constraint} to reject the write`);
  } catch (error) {
    const rendered = String(error);
    expect(rendered).toContain(pgCode);
    expect(rendered).toContain(constraint);
  }
}

describePostgres('ProjectMandateService structural foundation on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let other: Awaited<ReturnType<typeof createBookingFixture>>;
  let mandate: { id: string };
  let activityType: { id: string; code: string; nameFR: string; nameEN: string | null };
  let otherActivityType: { id: string; code: string; nameFR: string; nameEN: string | null };

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma);
    other = await createBookingFixture(prisma);
    mandate = await prisma.projectMandate.create({ data: {
      projectId: fixture.project.id,
      organizationId: fixture.org.id,
    } });
    activityType = await prisma.activityType.create({ data: {
      organizationId: fixture.org.id, code: `custom-${randomUUID()}`, nameFR: 'Service structurel',
    } });
    otherActivityType = await prisma.activityType.create({ data: {
      organizationId: other.org.id, code: `custom-${randomUUID()}`, nameFR: 'Autre service structurel',
    } });
  });

  afterAll(async () => prisma.$disconnect());

  const serviceData = (overrides: Record<string, unknown> = {}) => ({
    id: randomUUID(),
    projectMandateId: mandate.id,
    projectId: fixture.project.id,
    organizationId: fixture.org.id,
    activityTypeId: activityType.id,
    nameFRSnapshot: activityType.nameFR,
    nameENSnapshot: activityType.nameEN,
    createdById: fixture.owner.id,
    updatedById: fixture.owner.id,
    ...overrides,
  });

  it('creates a valid commercial service with structural defaults', async () => {
    const service = await prisma.projectMandateService.create({ data: serviceData() });
    expect(service).toMatchObject({
      commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1,
      displayOrder: 0, removedAt: null,
    });
  });

  it('rejects quantity zero', async () => {
    await expectDatabaseConstraint(
      prisma.projectMandateService.create({ data: serviceData({ quantity: 0 }) }),
      '23514', 'ProjectMandateService_quantity_check',
    );
  });

  it('enforces the status and removedAt contract', async () => {
    await expectDatabaseConstraint(
      prisma.projectMandateService.create({ data: serviceData({ removedAt: new Date() }) }),
      '23514', 'ProjectMandateService_status_removed_at_check',
    );
    await expectDatabaseConstraint(
      prisma.projectMandateService.create({ data: serviceData({ commercialStatus: 'REMOVED' }) }),
      '23514', 'ProjectMandateService_status_removed_at_check',
    );
    await expect(prisma.projectMandateService.create({ data: serviceData({
      commercialStatus: 'REMOVED', removedAt: new Date(), removedById: fixture.owner.id,
    }) })).resolves.toMatchObject({ commercialStatus: 'REMOVED' });
  });

  it('accepts an Activity link only inside the same Project and tenant', async () => {
    const service = await prisma.projectMandateService.create({ data: serviceData() });
    const localActivity = await prisma.projectActivity.create({ data: {
      projectId: fixture.project.id, organizationId: fixture.org.id,
      activityTypeId: activityType.id, type: activityType.code,
      label: 'Structural local Activity', duration: '1h', mandateServiceId: service.id,
    } });
    expect(localActivity.mandateServiceId).toBe(service.id);

    await expect(prisma.projectActivity.create({ data: {
      projectId: other.project.id, organizationId: other.org.id,
      activityTypeId: otherActivityType.id, type: otherActivityType.code,
      label: 'Cross-project Activity', duration: '1h', mandateServiceId: service.id,
    } })).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects a service whose Mandate, Project and tenant do not match', async () => {
    await expect(prisma.projectMandateService.create({ data: serviceData({
      projectId: other.project.id,
    }) })).rejects.toMatchObject({ code: 'P2003' });
  });

  it('restricts deletion of a referenced ActivityType', async () => {
    const type = await prisma.activityType.create({ data: {
      organizationId: fixture.org.id,
      code: `custom-${randomUUID()}`,
      nameFR: 'Type structurel',
    } });
    await prisma.projectMandateService.create({ data: serviceData({ activityTypeId: type.id }) });
    await expectDatabaseConstraint(
      prisma.activityType.delete({ where: { id: type.id } }),
      '23001', 'ProjectMandateService_activityTypeId_fkey',
    );
  });
});
