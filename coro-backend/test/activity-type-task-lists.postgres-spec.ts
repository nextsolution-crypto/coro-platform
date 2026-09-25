import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { ActivityTypesService } from '../src/activity-types/activity-types.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('ActivityType TaskList configuration on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let other: Awaited<ReturnType<typeof createBookingFixture>>;
  let typeId: string;
  let globalListId: string;
  let tenantAId: string;
  let tenantBId: string;
  let foreignListId: string;
  let before: { projectTaskList: number; projectTask: number; booking: number; activity: number };

  beforeAll(async () => {
    await prisma.$connect();
    [fixture, other] = await Promise.all([createBookingFixture(prisma), createBookingFixture(prisma)]);
    const systemType = await prisma.activityType.create({ data: {
      code: `gate-config-${suffix}`, nameFR: `Gate config ${suffix}`, isSystem: true,
    } });
    const [globalList, tenantA, tenantB, foreignList] = await Promise.all([
      prisma.taskList.create({ data: { name: `Global ${suffix}`, organizationId: null } }),
      prisma.taskList.create({ data: { name: `Tenant A ${suffix}`, organizationId: fixture.org.id } }),
      prisma.taskList.create({ data: { name: `Tenant B ${suffix}`, organizationId: fixture.org.id } }),
      prisma.taskList.create({ data: { name: `Foreign ${suffix}`, organizationId: other.org.id } }),
    ]);
    typeId = systemType.id; globalListId = globalList.id; tenantAId = tenantA.id; tenantBId = tenantB.id; foreignListId = foreignList.id;
    before = { projectTaskList: await prisma.projectTaskList.count(), projectTask: await prisma.projectTask.count(),
      booking: await prisma.booking.count(), activity: await prisma.projectActivity.count() };
  });
  afterAll(async () => prisma.$disconnect());

  const actor = () => ({ userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' });
  const service = () => new ActivityTypesService(prisma as never);
  const update = (mode: 'APPEND'|'REPLACE'|'DISABLE'|'INHERIT', ids: string[] = []) =>
    service().updateTaskListConfiguration(typeId, { scope: 'tenant', mode,
      taskLists: ids.map((taskListId, index) => ({ taskListId, displayOrder: (index + 1) * 10 })) }, actor());

  it('resolves tenant INHERIT, APPEND with deduplication, REPLACE and DISABLE', async () => {
    const globalPolicy = await prisma.activityTypeTaskListPolicy.create({ data: { activityTypeId: typeId, organizationId: null, mode: 'REPLACE' } });
    await prisma.activityTypeTaskList.create({ data: { policyId: globalPolicy.id, taskListId: globalListId, displayOrder: 10 } });
    expect((await service().resolveTaskLists({ activityTypeId: typeId, organizationId: fixture.org.id })).map(x => x.id))
      .toEqual([globalListId]);
    await update('APPEND', [globalListId, tenantBId]);
    expect((await service().resolveTaskLists({ activityTypeId: typeId, organizationId: fixture.org.id })).map(x => x.id))
      .toEqual([globalListId, tenantBId]);
    await update('REPLACE', [tenantBId]);
    expect((await service().resolveTaskLists({ activityTypeId: typeId, organizationId: fixture.org.id })).map(x => x.id)).toEqual([tenantBId]);
    await update('DISABLE');
    expect(await service().resolveTaskLists({ activityTypeId: typeId, organizationId: fixture.org.id })).toEqual([]);
    await update('INHERIT');
  });

  it('rejects cross-tenant resources and enforces policy/association uniqueness', async () => {
    await expect(update('APPEND', [foreignListId])).rejects.toBeInstanceOf(NotFoundException);
    const policy = await prisma.activityTypeTaskListPolicy.findFirstOrThrow({ where: { activityTypeId: typeId, organizationId: null } });
    await expect(prisma.activityTypeTaskListPolicy.create({ data: { activityTypeId: typeId, organizationId: null, mode: 'REPLACE' } })).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.activityTypeTaskList.create({ data: { policyId: policy.id, taskListId: globalListId, displayOrder: 30 } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('serializes concurrent replacements without mixing their associations', async () => {
    const outcomes = await Promise.allSettled([update('REPLACE', [tenantAId]), update('REPLACE', [tenantBId])]);
    expect(outcomes.every(result => result.status === 'fulfilled')).toBe(true);
    const resolved = await service().resolveTaskLists({ activityTypeId: typeId, organizationId: fixture.org.id });
    expect([[tenantAId], [tenantBId]]).toContainEqual(resolved.map(item => item.id));
  });

  it('deletes configuration without creating or deleting operational records', async () => {
    await update('INHERIT');
    expect(await prisma.activityTypeTaskListPolicy.count({ where: { activityTypeId: typeId, organizationId: fixture.org.id } })).toBe(0);
    await expect(Promise.all([prisma.projectTaskList.count(), prisma.projectTask.count(), prisma.booking.count(), prisma.projectActivity.count()]))
      .resolves.toEqual([before.projectTaskList, before.projectTask, before.booking, before.activity]);
  });
});
