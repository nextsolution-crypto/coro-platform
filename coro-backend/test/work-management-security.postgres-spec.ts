import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { createBookingFixture } from './booking-postgres-fixture';
import { TaskTemplatesService } from '../src/task-templates/task-templates.service';
import { TaskListsService } from '../src/task-lists/task-lists.service';
import { TimelogService } from '../src/timelog/timelog.service';
import { MandateService } from '../src/mandate/mandate.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Work Management tenant security on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  let a: Awaited<ReturnType<typeof createBookingFixture>>;
  let b: Awaited<ReturnType<typeof createBookingFixture>>;

  beforeAll(async () => {
    await prisma.$connect();
    a = await createBookingFixture(prisma);
    b = await createBookingFixture(prisma);
  });
  afterAll(async () => prisma.$disconnect());

  it('keeps a foreign TaskTemplate unchanged after an IDOR update attempt', async () => {
    const template = await prisma.taskTemplate.create({ data: {
      organizationId: b.org.id, categoryName: 'Gate', taskTitle: 'Original', documentTypes: [],
    } });
    await expect(new TaskTemplatesService(prisma as any).update(template.id, { taskTitle: 'Pwned' }, a.org.id))
      .rejects.toBeInstanceOf(NotFoundException);
    expect((await prisma.taskTemplate.findUniqueOrThrow({ where: { id: template.id } })).taskTitle).toBe('Original');
  });

  it('keeps a foreign TaskList and ProjectTaskList unchanged after IDOR attempts', async () => {
    const list = await prisma.taskList.create({ data: {
      organizationId: b.org.id, name: `Gate ${randomUUID()}`, documentTypes: [],
    } });
    const projectList = await prisma.projectTaskList.create({ data: {
      organizationId: b.org.id, projectId: b.project.id, taskListId: list.id, customName: 'Original',
    } });
    const service = new TaskListsService(prisma as any);
    await expect(service.update(list.id, { name: 'Pwned' }, a.org.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.renameProjectTaskList(projectList.id, 'Pwned', a.org.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await prisma.taskList.findUniqueOrThrow({ where: { id: list.id } })).name).not.toBe('Pwned');
    expect((await prisma.projectTaskList.findUniqueOrThrow({ where: { id: projectList.id } })).customName).toBe('Original');
  });

  it('cannot mutate a global TimelogCategory through a tenant operation', async () => {
    const key = `gate_${randomUUID().replace(/-/g, '')}`;
    await prisma.timelogCategory.create({ data: { key, label: 'Global', organizationId: null } });
    await expect(new TimelogService(prisma as any).updateCategory(key, { label: 'Pwned' }, a.org.id))
      .rejects.toBeInstanceOf(NotFoundException);
    expect((await prisma.timelogCategory.findFirstOrThrow({ where: { key, organizationId: null } })).label).toBe('Global');
  });

  it('keeps foreign ProjectTask, Comment and TaskTimeEntry unchanged', async () => {
    const task = await prisma.projectTask.create({ data: {
      organizationId: b.org.id, projectId: b.project.id, categoryName: 'Gate', taskTitle: 'Original',
    } });
    const comment = await prisma.projectComment.create({ data: {
      organizationId: b.org.id, projectId: b.project.id, userId: b.owner.id, contenu: 'Original',
    } });
    const entry = await prisma.taskTimeEntry.create({ data: {
      organizationId: b.org.id, taskId: task.id, userId: b.owner.id, date: new Date(), heures: 1,
    } });
    const service = new MandateService(prisma as any);
    await expect(service.updateTask(task.id, a.org.id, { status: 'fait' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateComment(b.project.id, comment.id, b.owner.id, a.org.id, 'Pwned'))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteTimeEntry(b.project.id, entry.id, b.owner.id, a.org.id))
      .rejects.toBeInstanceOf(NotFoundException);
    expect((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('a_faire');
    expect((await prisma.projectComment.findUniqueOrThrow({ where: { id: comment.id } })).contenu).toBe('Original');
    expect(await prisma.taskTimeEntry.count({ where: { id: entry.id } })).toBe(1);
  });

  it('removes only ProjectTaskList and preserves task history through ON DELETE SET NULL', async () => {
    const sourceList = await prisma.taskList.create({ data: {
      organizationId: a.org.id, name: `Safe removal ${randomUUID()}`, documentTypes: [],
    } });
    const [projectList, neighborList] = await Promise.all([
      prisma.projectTaskList.create({ data: {
        organizationId: a.org.id, projectId: a.project.id, taskListId: sourceList.id, customName: 'Target',
      } }),
      prisma.projectTaskList.create({ data: {
        organizationId: a.org.id, projectId: a.project.id, taskListId: sourceList.id, customName: 'Neighbor',
      } }),
    ]);
    const template = await prisma.taskTemplate.create({ data: {
      organizationId: a.org.id, taskListId: sourceList.id, categoryName: 'Gate',
      taskTitle: 'Template', documentTypes: [],
    } });
    const dueDate = new Date('2026-10-15T12:00:00.000Z');
    const task = await prisma.projectTask.create({ data: {
      organizationId: a.org.id, projectId: a.project.id, projectTaskListId: projectList.id,
      templateId: template.id, categoryName: 'Gate', taskTitle: 'Historical work', status: 'en_cours',
      dueDate, assigneeId: a.owner.id,
    } });
    const assignment = await prisma.projectTaskAssignee.create({ data: {
      taskId: task.id, userId: a.colleague.id,
    } });
    const timeEntry = await prisma.taskTimeEntry.create({ data: {
      organizationId: a.org.id, taskId: task.id, userId: a.owner.id,
      date: new Date('2026-10-10T12:00:00.000Z'), heures: 2.5,
    } });

    await new TaskListsService(prisma as any).deleteProjectTaskList(projectList.id, a.org.id);

    expect(await prisma.projectTaskList.findUnique({ where: { id: projectList.id } })).toBeNull();
    expect(await prisma.projectTaskList.findUnique({ where: { id: neighborList.id } })).not.toBeNull();
    expect(await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({
      projectTaskListId: null, projectId: a.project.id, templateId: template.id,
      status: 'en_cours', dueDate, assigneeId: a.owner.id,
    });
    expect(await prisma.projectTaskAssignee.findUnique({ where: { id: assignment.id } })).not.toBeNull();
    expect(await prisma.taskTimeEntry.findUnique({ where: { id: timeEntry.id } })).not.toBeNull();
  });
});
