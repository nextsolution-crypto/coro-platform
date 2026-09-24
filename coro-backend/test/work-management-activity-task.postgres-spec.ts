import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createBookingFixture } from './booking-postgres-fixture';
import { MandateService } from '../src/mandate/mandate.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('ProjectActivity to ProjectTask integrity on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  const createActivity = async (fixture: Awaited<ReturnType<typeof createBookingFixture>>, projectId = fixture.project.id) =>
    prisma.projectActivity.create({ data: {
      id: randomUUID(), projectId, organizationId: fixture.org.id,
      type: 'inspection', label: 'Gate activity', duration: '1h',
    } });

  const createTask = async (fixture: Awaited<ReturnType<typeof createBookingFixture>>, activityId?: string) =>
    prisma.projectTask.create({ data: {
      id: randomUUID(), projectId: fixture.project.id, organizationId: fixture.org.id,
      categoryName: 'Gate', taskTitle: 'Gate task', ...(activityId ? { activityId } : {}),
    } });

  it('keeps existing NULL tasks compatible and links/unlinks a virgin task atomically with audit logs', async () => {
    const fixture = await createBookingFixture(prisma);
    const activity = await createActivity(fixture);
    const task = await createTask(fixture);
    expect(task.activityId).toBeNull();
    const service = new MandateService(prisma as any);
    const actor = { userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' };

    await service.setTaskActivity(fixture.project.id, task.id, activity.id, actor);
    expect((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).activityId).toBe(activity.id);
    expect(await prisma.auditLog.count({ where: {
      action: 'TASK_LINKED_TO_ACTIVITY', entityId: task.id, organizationId: fixture.org.id,
    } })).toBe(1);

    await service.setTaskActivity(fixture.project.id, task.id, null, actor);
    expect((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).activityId).toBeNull();
    expect(await prisma.auditLog.count({ where: {
      action: 'TASK_UNLINKED_FROM_ACTIVITY', entityId: task.id, organizationId: fixture.org.id,
    } })).toBe(1);
  });

  it('rejects cross-project and cross-tenant links in both the service and the composite foreign key', async () => {
    const [a, b] = await Promise.all([createBookingFixture(prisma), createBookingFixture(prisma)]);
    const otherProject = await prisma.project.create({ data: {
      id: randomUUID(), organizationId: a.org.id, clientId: a.client.id, buildingId: a.building.id,
      userId: a.owner.id, name: `Other project ${randomUUID()}`, documentType: 'PMU', year: 2026,
    } });
    const [crossProjectActivity, crossTenantActivity, task] = await Promise.all([
      createActivity(a, otherProject.id), createActivity(b), createTask(a),
    ]);
    const service = new MandateService(prisma as any);
    const actor = { userId: a.admin.id, organizationId: a.org.id, role: 'ADMIN' };

    await expect(service.setTaskActivity(a.project.id, task.id, crossProjectActivity.id, actor))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setTaskActivity(a.project.id, task.id, crossTenantActivity.id, actor))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(prisma.projectTask.update({ where: { id: task.id }, data: { activityId: crossProjectActivity.id } }))
      .rejects.toMatchObject({ code: 'P2003' });
    await expect(prisma.projectTask.update({ where: { id: task.id }, data: { activityId: crossTenantActivity.id } }))
      .rejects.toMatchObject({ code: 'P2003' });
    expect((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).activityId).toBeNull();
  });

  it('enforces ON DELETE RESTRICT for linked tasks and allows deletion after a valid unlink', async () => {
    const fixture = await createBookingFixture(prisma);
    const activity = await createActivity(fixture);
    const task = await createTask(fixture, activity.id);
    await expect(prisma.projectActivity.delete({ where: { id: activity.id } }))
      .rejects.toThrow('violates RESTRICT setting');
    expect(await prisma.projectTask.findUnique({ where: { id: task.id } })).not.toBeNull();

    await new MandateService(prisma as any).setTaskActivity(fixture.project.id, task.id, null, {
      userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN',
    });
    await expect(prisma.projectActivity.delete({ where: { id: activity.id } })).resolves.toMatchObject({ id: activity.id });
    expect(await prisma.projectTask.findUnique({ where: { id: task.id } })).not.toBeNull();
  });

  it('preserves time and assignments when provenance changes are refused', async () => {
    const fixture = await createBookingFixture(prisma);
    const activity = await createActivity(fixture);
    const task = await createTask(fixture, activity.id);
    const [entry, assignment] = await Promise.all([
      prisma.taskTimeEntry.create({ data: {
        taskId: task.id, userId: fixture.owner.id, organizationId: fixture.org.id,
        date: new Date('2026-09-23T12:00:00.000Z'), heures: 1,
      } }),
      prisma.projectTaskAssignee.create({ data: { taskId: task.id, userId: fixture.colleague.id } }),
    ]);
    await expect(new MandateService(prisma as any).setTaskActivity(fixture.project.id, task.id, null, {
      userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN',
    })).rejects.toBeInstanceOf(ConflictException);
    expect((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).activityId).toBe(activity.id);
    expect(await prisma.taskTimeEntry.findUnique({ where: { id: entry.id } })).not.toBeNull();
    expect(await prisma.projectTaskAssignee.findUnique({ where: { id: assignment.id } })).not.toBeNull();
  });

  it('allows exactly one of two concurrent links and leaves a coherent final relation', async () => {
    const fixture = await createBookingFixture(prisma);
    const [activityA, activityB, task] = await Promise.all([
      createActivity(fixture), createActivity(fixture), createTask(fixture),
    ]);
    const service = new MandateService(prisma as any);
    const actor = { userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' };
    const results = await Promise.allSettled([
      service.setTaskActivity(fixture.project.id, task.id, activityA.id, actor),
      service.setTaskActivity(fixture.project.id, task.id, activityB.id, actor),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const finalTask = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    expect([activityA.id, activityB.id]).toContain(finalTask.activityId);
    expect(await prisma.auditLog.count({ where: {
      action: 'TASK_LINKED_TO_ACTIVITY', entityId: task.id, organizationId: fixture.org.id,
    } })).toBe(1);
  });
});
