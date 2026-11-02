import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MandateService } from '../src/mandate/mandate.service';
import { RendementFinancialService } from '../src/mandate/rendement-financial.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres(
  'Archived Project operational read-only policy on PostgreSQL',
  () => {
    const prisma = databaseUrl
      ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
      : new PrismaClient();

    afterAll(async () => prisma.$disconnect());

    it('keeps history readable while refusing archived, inactive, concurrent and out-of-scope writes', async () => {
      await prisma.$connect();
      const fixture = await createBookingFixture(prisma, true);
      const actor = {
        userId: fixture.owner.id,
        organizationId: fixture.org.id,
        role: 'OPERATOR',
      };
      const service = new MandateService(prisma as any);
      const rendement = new RendementFinancialService(prisma as any, {} as any);
      const marker = randomUUID();

      const task = await service.createTask(
        fixture.project.id,
        {
          taskTitle: `Active ${marker}`,
          categoryName: 'QA',
        },
        actor,
      );
      await service.addTimeEntry(fixture.project.id, task.id, actor, {
        date: '2026-11-02',
        heures: 2.5,
        note: marker,
      });
      const before = await rendement.operational(actor, {
        from: '2026-11-01',
        to: '2026-11-03',
      });

      await prisma.project.update({
        where: { id: fixture.project.id },
        data: { status: 'ARCHIVED' },
      });
      const countsBeforeRefusal = {
        tasks: await prisma.projectTask.count({
          where: { projectId: fixture.project.id },
        }),
        time: await prisma.taskTimeEntry.count({
          where: { task: { projectId: fixture.project.id } },
        }),
        audits: await prisma.auditLog.count({
          where: { projectId: fixture.project.id },
        }),
      };
      await expect(
        service.createTask(
          fixture.project.id,
          { taskTitle: 'Forbidden archive' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.addTimeEntry(fixture.project.id, task.id, actor, {
          date: '2026-11-02',
          heures: 1,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.updateTask(fixture.project.id, task.id, actor, {
          status: 'fait',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.deleteTimeEntry(
          fixture.project.id,
          (
            await prisma.taskTimeEntry.findFirstOrThrow({
              where: { taskId: task.id },
            })
          ).id,
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(
        await prisma.projectTask.count({
          where: { projectId: fixture.project.id },
        }),
      ).toBe(countsBeforeRefusal.tasks);
      expect(
        await prisma.taskTimeEntry.count({
          where: { task: { projectId: fixture.project.id } },
        }),
      ).toBe(countsBeforeRefusal.time);
      expect(
        await prisma.auditLog.count({
          where: { projectId: fixture.project.id },
        }),
      ).toBe(countsBeforeRefusal.audits);
      expect(
        (await service.getTasks(fixture.project.id, actor)).some(
          (row) => row.id === task.id,
        ),
      ).toBe(true);
      expect(
        (await service.getTimesheet(fixture.project.id, actor)).entries.some(
          (row) => row.note === marker,
        ),
      ).toBe(true);
      const after = await rendement.operational(actor, {
        from: '2026-11-01',
        to: '2026-11-03',
      });
      expect(after).toEqual(before);

      await prisma.project.update({
        where: { id: fixture.project.id },
        data: { status: 'IN_PROGRESS', isActive: false },
      });
      await expect(
        service.createTask(
          fixture.project.id,
          { taskTitle: 'Forbidden inactive' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      await prisma.project.update({
        where: { id: fixture.project.id },
        data: { isActive: true },
      });
      await expect(
        service.createTask(
          fixture.project.id,
          { taskTitle: 'Foreign' },
          {
            userId: fixture.outsider!.id,
            organizationId: fixture.otherOrg!.id,
            role: 'ADMIN',
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.createTask(
          fixture.project.id,
          { taskTitle: 'Unassigned' },
          {
            userId: fixture.colleague.id,
            organizationId: fixture.org.id,
            role: 'OPERATOR',
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      let archived!: () => void;
      const archiveApplied = new Promise<void>((resolve) => {
        archived = resolve;
      });
      let releaseArchive!: () => void;
      const allowCommit = new Promise<void>((resolve) => {
        releaseArchive = resolve;
      });
      const archiveTransaction = prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: fixture.project.id },
          data: { status: 'ARCHIVED' },
        });
        archived();
        await allowCommit;
      });
      await archiveApplied;
      const concurrentMutation = service.createTask(
        fixture.project.id,
        { taskTitle: `Concurrent ${marker}` },
        actor,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      releaseArchive();
      await archiveTransaction;
      await expect(concurrentMutation).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        await prisma.projectTask.count({
          where: {
            projectId: fixture.project.id,
            taskTitle: `Concurrent ${marker}`,
          },
        }),
      ).toBe(0);
    });
  },
);
