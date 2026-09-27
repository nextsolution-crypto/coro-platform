import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MandateServicesService } from '../src/mandate/mandate-services.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('ProjectMandateService commercial API on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const service = new MandateServicesService(prisma as any);
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let other: Awaited<ReturnType<typeof createBookingFixture>>;
  let mandateId: string;
  let type: { id: string; nameFR: string; nameEN: string | null };
  let actor: { userId: string; organizationId: string; role: string };

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma);
    other = await createBookingFixture(prisma);
    mandateId = (await prisma.projectMandate.create({ data: {
      projectId: fixture.project.id, organizationId: fixture.org.id,
    } })).id;
    type = await prisma.activityType.create({ data: {
      organizationId: fixture.org.id, code: `custom-${randomUUID()}`,
      nameFR: 'Inspection commerciale', nameEN: 'Commercial inspection',
    } });
    actor = { userId: fixture.owner.id, organizationId: fixture.org.id, role: 'ADMIN' };
  });
  afterAll(async () => prisma.$disconnect());

  const line = (overrides: Record<string, unknown> = {}) => ({
    activityTypeId: type.id, recurrenceMode: 'ONCE' as const, quantity: 1, displayOrder: 10, ...overrides,
  });

  it('reads an empty state and creates server snapshots without operational writes', async () => {
    const empty = await service.list(fixture.project.id, actor);
    expect(empty.services).toEqual([]);
    const activityCount = await prisma.projectActivity.count({ where: { projectId: fixture.project.id } });
    const saved = await service.save(fixture.project.id, actor, { expectedRevision: empty.revision, services: [line()] });
    expect(saved.services).toHaveLength(1);
    expect(saved.services[0]).toMatchObject({ projectMandateId: mandateId, activityTypeId: type.id,
      commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1, displayOrder: 0,
      nameFRSnapshot: type.nameFR, nameENSnapshot: type.nameEN });
    expect(await prisma.projectActivity.count({ where: { projectId: fixture.project.id } })).toBe(activityCount);
    expect(await prisma.auditLog.count({ where: { projectId: fixture.project.id,
      action: 'MANDATE_SERVICE_ADDED', entityId: saved.services[0].id } })).toBe(1);
  });

  it('accepts a lost-response retry as a no-op and creates no duplicate or audit', async () => {
    const current = await service.list(fixture.project.id, actor);
    const auditsBefore = await prisma.auditLog.count({ where: { projectId: fixture.project.id } });
    const retry = await service.save(fixture.project.id, actor, {
      expectedRevision: 'stale-revision-from-before-create', services: [line()],
    });
    expect(retry.revision).toBe(current.revision);
    expect(retry.services).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { projectId: fixture.project.id } })).toBe(auditsBefore);
  });

  it('updates, removes and restores the same line with immutable snapshots and audits', async () => {
    let state = await service.list(fixture.project.id, actor);
    const id = state.services[0].id;
    state = await service.save(fixture.project.id, actor, { expectedRevision: state.revision,
      services: [line({ id, recurrenceMode: 'ANNUAL', quantity: 3 })] });
    expect(state.services[0]).toMatchObject({ id, recurrenceMode: 'ANNUAL', quantity: 3, nameFRSnapshot: type.nameFR });
    state = await service.save(fixture.project.id, actor, { expectedRevision: state.revision, services: [] });
    expect(state.services[0]).toMatchObject({ id, commercialStatus: 'REMOVED' });
    expect(state.services[0].removedAt).not.toBeNull();
    state = await service.save(fixture.project.id, actor, { expectedRevision: state.revision,
      services: [line({ id, recurrenceMode: 'ANNUAL', quantity: 3 })] });
    expect(state.services[0]).toMatchObject({ id, commercialStatus: 'ACTIVE', removedAt: null,
      nameFRSnapshot: type.nameFR });
    const actions = await prisma.auditLog.findMany({ where: { entityId: id }, select: { action: true } });
    expect(actions.map(item => item.action)).toEqual(expect.arrayContaining([
      'MANDATE_SERVICE_ADDED', 'MANDATE_SERVICE_UPDATED', 'MANDATE_SERVICE_REMOVED', 'MANDATE_SERVICE_RESTORED',
    ]));
  });

  it('rejects stale writes without losing the winning update', async () => {
    const initial = await service.list(fixture.project.id, actor);
    const id = initial.services[0].id;
    const winner = await service.save(fixture.project.id, actor, { expectedRevision: initial.revision,
      services: [line({ id, recurrenceMode: 'ANNUAL', quantity: 4 })] });
    await expect(service.save(fixture.project.id, actor, { expectedRevision: initial.revision,
      services: [line({ id, recurrenceMode: 'ONCE', quantity: 2 })] })).rejects.toBeInstanceOf(ConflictException);
    const final = await service.list(fixture.project.id, actor);
    expect(final.revision).toBe(winner.revision);
    expect(final.services[0].quantity).toBe(4);
  });

  it('serializes two concurrent saves so exactly one revision wins', async () => {
    const initial = await service.list(fixture.project.id, actor);
    const active = initial.services.filter(item => item.commercialStatus === 'ACTIVE');
    const request = (quantity: number) => service.save(fixture.project.id, actor, {
      expectedRevision: initial.revision,
      services: active.map((item, index) => line({ id: item.id, activityTypeId: item.activityTypeId,
        recurrenceMode: item.recurrenceMode, quantity: index === 0 ? quantity : item.quantity })),
    });
    const results = await Promise.allSettled([request(6), request(7)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect((results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason)
      .toBeInstanceOf(ConflictException);
    expect([6, 7]).toContain((await service.list(fixture.project.id, actor)).services
      .find(item => item.id === active[0].id)?.quantity);
  });

  it('validates all new types before writing and rolls a multi-line request back', async () => {
    const initial = await service.list(fixture.project.id, actor);
    const countBefore = initial.services.length;
    const crossTenant = await prisma.activityType.create({ data: {
      organizationId: other.org.id, code: `custom-${randomUUID()}`, nameFR: 'Interdit',
    } });
    await expect(service.save(fixture.project.id, actor, { expectedRevision: initial.revision,
      services: [...initial.services.map(item => line({ id: item.id, recurrenceMode: item.recurrenceMode,
        quantity: item.quantity })), line(), line({ activityTypeId: crossTenant.id })],
    })).rejects.toThrow("Type d'activité indisponible");
    expect((await service.list(fixture.project.id, actor)).services).toHaveLength(countBefore);
  });

  it('supports two independent new lines of the same ActivityType', async () => {
    const initial = await service.list(fixture.project.id, actor);
    const desired = initial.services.filter(item => item.commercialStatus === 'ACTIVE').map(item =>
      line({ id: item.id, recurrenceMode: item.recurrenceMode, quantity: item.quantity }));
    const saved = await service.save(fixture.project.id, actor, { expectedRevision: initial.revision,
      services: [...desired, line({ quantity: 5 }), line({ quantity: 5 })] });
    expect(saved.services.filter(item => item.commercialStatus === 'ACTIVE' && item.activityTypeId === type.id).length)
      .toBeGreaterThanOrEqual(3);
  });

  it('keeps archived snapshots readable, permits active-line edits, and refuses restoration', async () => {
    await prisma.activityType.update({ where: { id: type.id }, data: { isActive: false, archivedAt: new Date() } });
    let state = await service.list(fixture.project.id, actor);
    const active = state.services.find(item => item.commercialStatus === 'ACTIVE')!;
    state = await service.save(fixture.project.id, actor, { expectedRevision: state.revision,
      services: state.services.filter(item => item.commercialStatus === 'ACTIVE').map(item => line({
        id: item.id, recurrenceMode: item.recurrenceMode, quantity: item.id === active.id ? item.quantity + 1 : item.quantity,
      })) });
    expect(state.services.find(item => item.id === active.id)?.nameFRSnapshot).toBe(type.nameFR);
    state = await service.save(fixture.project.id, actor, { expectedRevision: state.revision,
      services: state.services.filter(item => item.commercialStatus === 'ACTIVE' && item.id !== active.id).map(item => line({
        id: item.id, recurrenceMode: item.recurrenceMode, quantity: item.quantity,
      })) });
    await expect(service.save(fixture.project.id, actor, { expectedRevision: state.revision,
      services: [...state.services.filter(item => item.commercialStatus === 'ACTIVE').map(item => line({
        id: item.id, recurrenceMode: item.recurrenceMode, quantity: item.quantity,
      })), line({ id: active.id })] })).rejects.toThrow("Type d'activité indisponible");
  });
});
