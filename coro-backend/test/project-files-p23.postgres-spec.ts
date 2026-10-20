import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProjectFilesService } from '../src/project-files/project-files.service';
import { ProjectFileExpiryRemindersService } from '../src/project-files/project-file-expiry-reminders.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('P-2.3 ProjectFile governance on PostgreSQL 16', () => {
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();
  const service = new ProjectFilesService(
    prisma,
    { downloadPrivate: jest.fn(async () => Buffer.from('qa-document')) } as any,
    { create: jest.fn() } as any,
  );
  const reminders = new ProjectFileExpiryRemindersService(prisma);
  const ids = {
    organization: randomUUID(),
    user: randomUUID(),
    escalation: randomUUID(),
    client: randomUUID(),
    building: randomUUID(),
    project: randomUUID(),
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: ids.organization, name: `P23 QA ${randomUUID()}` },
    });
    for (const [id, label] of [
      [ids.user, 'Responsible'],
      [ids.escalation, 'Escalation'],
    ]) {
      await prisma.user.create({
        data: {
          id,
          organizationId: ids.organization,
          email: `${randomUUID()}@p23.invalid`,
          password: 'synthetic-only',
          firstName: 'P23',
          lastName: label,
          role: 'OPERATOR',
        },
      });
    }
    await prisma.client.create({
      data: {
        id: ids.client,
        organizationId: ids.organization,
        name: 'P23 synthetic client',
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        organizationId: ids.organization,
        clientId: ids.client,
        name: 'P23 synthetic building',
        address: '1 QA Street',
        city: 'Toronto',
        province: 'ON',
      },
    });
    await prisma.project.create({
      data: {
        id: ids.project,
        organizationId: ids.organization,
        clientId: ids.client,
        buildingId: ids.building,
        userId: ids.user,
        name: 'P23 synthetic project',
        documentType: 'PMU',
        year: 2026,
      },
    });
  });

  afterAll(async () => {
    const files = await prisma.projectFile.findMany({
      where: { projectId: ids.project },
      select: { id: true },
    });
    const fileIds = files.map(({ id }) => id);
    await prisma.projectFileExpiryReminder.deleteMany({
      where: { projectFileId: { in: fileIds } },
    });
    await prisma.notification.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.projectFileLifecycleEvent.deleteMany({
      where: { projectFileId: { in: fileIds } },
    });
    await prisma.projectFile.deleteMany({ where: { id: { in: fileIds } } });
    await prisma.project.delete({ where: { id: ids.project } });
    await prisma.building.delete({ where: { id: ids.building } });
    await prisma.client.delete({ where: { id: ids.client } });
    await prisma.user.deleteMany({
      where: { organizationId: ids.organization },
    });
    await prisma.organization.delete({ where: { id: ids.organization } });
    await prisma.$disconnect();
  });

  const createFile = async (version: number, parentId: string | null) =>
    prisma.projectFile.create({
      data: {
        projectId: ids.project,
        organizationId: ids.organization,
        name: `plan-v${version}.pdf`,
        category: 'plans_evacuation',
        size: 11,
        mimeType: 'application/pdf',
        storageKey: `qa/p23/${randomUUID()}`,
        url: 'private:project-file',
        version,
        parentId,
        uploadedById: ids.user,
        visibility: 'shared',
        lifecycleState: 'REVIEW',
        sha256: randomUUID().replaceAll('-', ''),
      },
    });

  it('resolves one current version and schedules a future replacement atomically', async () => {
    const v1 = await createFile(1, null);
    const yesterday = new Date(Date.now() - 86_400_000);
    await service.approveFile({
      fileId: v1.id,
      organizationId: ids.organization,
      actorId: ids.user,
      reason: 'P23 approval version one',
      requestId: `approve-${randomUUID()}`,
      lockVersion: 0,
      effectiveAt: yesterday.toISOString(),
      expiresAt: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    });
    const v2 = await createFile(2, v1.id);
    const tomorrow = new Date(Date.now() + 86_400_000);
    await service.approveFile({
      fileId: v2.id,
      organizationId: ids.organization,
      actorId: ids.user,
      reason: 'P23 scheduled replacement version two',
      requestId: `approve-${randomUUID()}`,
      lockVersion: 0,
      effectiveAt: tomorrow.toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    });
    await expect(
      service.resolveCurrentVersion(v1.id, ids.organization, new Date()),
    ).resolves.toMatchObject({ id: v1.id, isCurrent: true });
    await expect(
      service.resolveCurrentVersion(
        v1.id,
        ids.organization,
        new Date(tomorrow.getTime() + 1000),
      ),
    ).resolves.toMatchObject({ id: v2.id, isCurrent: true });
  });

  it('permits exactly one concurrent approval at an identical effective time', async () => {
    const root = await createFile(1, null);
    const a = await createFile(2, root.id);
    const b = await createFile(3, root.id);
    const effectiveAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const results = await Promise.allSettled(
      [a, b].map((file) =>
        service.approveFile({
          fileId: file.id,
          organizationId: ids.organization,
          actorId: ids.user,
          reason: 'P23 concurrent approval control',
          requestId: `approve-${randomUUID()}`,
          lockVersion: 0,
          effectiveAt,
        }),
      ),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
  });

  it('creates idempotent internal reminders and governed acknowledgment', async () => {
    const file = await createFile(1, null);
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    await prisma.projectFile.update({
      where: { id: file.id },
      data: {
        lifecycleState: 'APPROVED',
        effectiveAt: new Date(Date.now() - 1000),
        expiresAt: new Date(startOfDay.getTime() + 30 * 86_400_000),
        documentResponsibleUserId: ids.user,
        expiryEscalationUserId: ids.escalation,
      },
    });
    await reminders.process(now);
    await reminders.process(now);
    const sent = await prisma.projectFileExpiryReminder.findMany({
      where: { projectFileId: file.id },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      thresholdDays: 30,
      recipientKind: 'PRIMARY',
    });
    await expect(
      reminders.acknowledge(sent[0].id, ids.organization, ids.user),
    ).resolves.toMatchObject({ status: 'ACKNOWLEDGED' });
  });
});
