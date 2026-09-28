import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MandateOperationsPreviewService } from '../src/mandate/mandate-operations-preview.service';
import { MandateServicesService } from '../src/mandate/mandate-services.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Mandate operational preview read-only gate on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const commercial = new MandateServicesService(prisma as any);
  const preview = new MandateOperationsPreviewService(prisma as any, commercial);
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let actor: { userId: string; organizationId: string; role: string };
  let revision: string;

  const counts = () => Promise.all([prisma.projectMandateService.count(), prisma.projectActivity.count(),
    prisma.projectTaskList.count(), prisma.projectTask.count(), prisma.booking.count(), prisma.auditLog.count()]);

  beforeAll(async () => {
    await prisma.$connect(); fixture = await createBookingFixture(prisma);
    actor = { userId: fixture.owner.id, organizationId: fixture.org.id, role: 'ADMIN' };
    const mandate = await prisma.projectMandate.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id } });
    const types = await Promise.all(['Tour Premont', 'Nouveau', 'Lie'].map((name, index) => prisma.activityType.create({ data: {
      organizationId: fixture.org.id, code: `custom-${randomUUID()}`, nameFR: name, displayOrder: index,
    } })));
    const services = await Promise.all(types.map((type, index) => prisma.projectMandateService.create({ data: {
      projectMandateId: mandate.id, projectId: fixture.project.id, organizationId: fixture.org.id,
      activityTypeId: type.id, nameFRSnapshot: type.nameFR, displayOrder: index,
      createdById: fixture.owner.id, updatedById: fixture.owner.id,
    } })));
    for (let index = 0; index < 4; index++) await prisma.projectActivity.create({ data: {
      projectId: fixture.project.id, organizationId: fixture.org.id, activityTypeId: types[0].id,
      type: types[0].code, label: `Legacy ${index}`, duration: '1h', sourceMandate: true,
      status: index === 3 ? 'a_faire' : 'annule',
    } });
    await prisma.projectActivity.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
      activityTypeId: types[2].id, type: types[2].code, label: 'Liée', duration: '1h', sourceMandate: true,
      mandateServiceId: services[2].id } });
    revision = (await commercial.list(fixture.project.id, actor)).revision;
  });
  afterAll(async () => prisma.$disconnect());

  it('returns deterministic legacy, create and linked operations without writes', async () => {
    const before = await counts();
    const first = await preview.preview(fixture.project.id, actor, revision);
    const second = await preview.preview(fixture.project.id, actor, revision);
    expect(first.operations.map(item => ({ serviceId: item.serviceId, action: item.action, reason: item.reasonCode })))
      .toEqual(second.operations.map(item => ({ serviceId: item.serviceId, action: item.action, reason: item.reasonCode })));
    expect(first.operations.map(item => item.reasonCode)).toEqual([
      'LEGACY_MULTIPLE_CANDIDATES', 'NO_ACTIVITY_EXISTS', 'ACTIVE_ACTIVITY_EXISTS',
    ]);
    expect(first.summary).toEqual({ noAction: 1, createActivity: 1, requiresDecision: 1, blocked: 0 });
    expect(await counts()).toEqual(before);
  });

  it('rejects a stale commercial revision without writes', async () => {
    const before = await counts();
    await expect(preview.preview(fixture.project.id, actor, '0'.repeat(64))).rejects.toBeInstanceOf(ConflictException);
    expect(await counts()).toEqual(before);
  });
});
