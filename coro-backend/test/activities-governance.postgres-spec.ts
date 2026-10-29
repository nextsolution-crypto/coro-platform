import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from '../src/activities/activities.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Activities canonical scope on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const activityTypes = { list: jest.fn().mockResolvedValue([]) };
  const service = new ActivitiesService(
    prisma as never,
    activityTypes as never,
  );
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let forbiddenProjectId: string;
  let forbiddenActivityId: string;

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma);
    const forbiddenProject = await prisma.project.create({
      data: {
        id: randomUUID(),
        organizationId: fixture.org.id,
        clientId: fixture.client.id,
        buildingId: fixture.building.id,
        userId: fixture.colleague.id,
        name: 'Unassigned project',
        documentType: 'PMU',
        year: 2026,
      },
    });
    forbiddenProjectId = forbiddenProject.id;
    forbiddenActivityId = (
      await prisma.projectActivity.create({
        data: {
          projectId: forbiddenProject.id,
          organizationId: fixture.org.id,
          type: 'inspection',
          label: 'Protected activity',
          duration: '1h',
          notes: 'unchanged',
        },
      })
    ).id;
    await prisma.projectActivity.create({
      data: {
        projectId: fixture.project.id,
        organizationId: fixture.org.id,
        type: 'inspection',
        label: 'Authorized activity',
        duration: '1h',
      },
    });
  });

  afterAll(async () => prisma.$disconnect());

  const operator = () => ({
    userId: fixture.owner.id,
    organizationId: fixture.org.id,
    role: 'OPERATOR',
  });
  const admin = () => ({
    userId: fixture.admin.id,
    organizationId: fixture.org.id,
    role: 'ADMIN',
  });

  it('denies update, delete and duplication outside the operator project scope without side effects', async () => {
    await expect(
      service.updateActivity(forbiddenActivityId, operator(), {
        notes: 'forged',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.deleteActivity(forbiddenActivityId, operator()),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.duplicateActivities(forbiddenProjectId, operator()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      await prisma.projectActivity.findUniqueOrThrow({
        where: { id: forbiddenActivityId },
      }),
    ).toMatchObject({ notes: 'unchanged' });
    expect(
      await prisma.projectActivity.count({
        where: { projectId: forbiddenProjectId },
      }),
    ).toBe(1);
  });

  it('scopes both aggregate portfolios to the operator projects while preserving admin access', async () => {
    const operatorRows = await service.getPortfolio(operator());
    expect(operatorRows.map((row) => row.projectId)).toEqual([
      fixture.project.id,
    ]);
    const operatorClient = await service.getClientPortfolio(
      fixture.client.id,
      operator(),
    );
    expect(operatorClient.projects.map((project) => project.projectId)).toEqual(
      [fixture.project.id],
    );
    const adminRows = await service.getPortfolio(admin());
    expect(new Set(adminRows.map((row) => row.projectId))).toEqual(
      new Set([fixture.project.id, forbiddenProjectId]),
    );
  });

  it('returns an authorized activity beyond the former 200-project boundary in one query', async () => {
    const projects = Array.from({ length: 201 }, () => ({
      id: randomUUID(),
      organizationId: fixture.org.id,
      clientId: fixture.client.id,
      buildingId: fixture.building.id,
      userId: fixture.owner.id,
      name: `Scale project ${randomUUID()}`,
      documentType: 'PMU' as const,
      year: 2026,
    }));
    await prisma.project.createMany({ data: projects });
    await prisma.projectActivity.createMany({
      data: projects.map((project, index) => ({
        id: randomUUID(),
        projectId: project.id,
        organizationId: fixture.org.id,
        type: 'inspection',
        label: `Scale activity ${index}`,
        duration: '1h',
      })),
    });
    const result = await service.getPortfolio(operator());
    expect(
      result.filter((row) => row.label.startsWith('Scale activity')),
    ).toHaveLength(201);
    expect(result.some((row) => row.label === 'Scale activity 200')).toBe(true);
  });

  it('refuses mutations for archived and inactive projects', async () => {
    await prisma.project.update({
      where: { id: fixture.project.id },
      data: { status: 'ARCHIVED' },
    });
    const activity = await prisma.projectActivity.findFirstOrThrow({
      where: { projectId: fixture.project.id },
    });
    await expect(
      service.updateActivity(activity.id, admin(), { notes: 'forged' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await prisma.project.update({
      where: { id: fixture.project.id },
      data: { status: 'IN_PROGRESS', isActive: false },
    });
    await expect(
      service.deleteActivity(activity.id, admin()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
