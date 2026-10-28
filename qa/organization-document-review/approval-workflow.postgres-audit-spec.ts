import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ApprovalService } from '../../coro-backend/src/approval/approval.service';

jest.mock('../../coro-backend/src/export/export.service', () => ({
  ExportService: class ExportService {},
}));

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL jetable est obligatoire');

describe('Organization document review PostgreSQL characterization', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const suffix = randomUUID();
  const ids = {
    org: `review-org-${suffix}`,
    author: `review-author-${suffix}`,
    reviewer: `review-reviewer-${suffix}`,
    unassigned: `review-unassigned-${suffix}`,
    client: `review-client-${suffix}`,
    building: `review-building-${suffix}`,
    project: `review-project-${suffix}`,
    document: `review-document-${suffix}`,
  };
  const author = { userId: ids.author, organizationId: ids.org, role: 'OPERATOR' };
  const approval = new ApprovalService(
    prisma as any,
    {
      create: jest.fn().mockResolvedValue({}),
      createForOrganization: jest.fn().mockResolvedValue({}),
    } as any,
    { sendDocumentAvailable: jest.fn().mockResolvedValue({}) } as any,
    { generatePdf: jest.fn(() => new Promise(() => undefined)) } as any,
    { uploadFile: jest.fn() } as any,
  );

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({ data: { id: ids.org, name: 'Review QA Org' } });
    await prisma.user.createMany({
      data: [
        {
          id: ids.author,
          email: `${ids.author}@example.invalid`,
          password: 'synthetic',
          firstName: 'Author',
          lastName: 'Synthetic',
          role: 'OPERATOR',
          organizationId: ids.org,
        },
        {
          id: ids.reviewer,
          email: `${ids.reviewer}@example.invalid`,
          password: 'synthetic',
          firstName: 'Reviewer',
          lastName: 'Synthetic',
          role: 'ADMIN',
          organizationId: ids.org,
        },
        {
          id: ids.unassigned,
          email: `${ids.unassigned}@example.invalid`,
          password: 'synthetic',
          firstName: 'Unassigned',
          lastName: 'Synthetic',
          role: 'OPERATOR',
          organizationId: ids.org,
        },
      ],
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'Review QA Client',
        organizationId: ids.org,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        name: 'Review QA Building',
        address: '1 Synthetic',
        city: 'Montreal',
        province: 'QC',
        organizationId: ids.org,
        clientId: ids.client,
      },
    });
    await prisma.project.create({
      data: {
        id: ids.project,
        name: 'Review QA PMU',
        documentType: 'PMU',
        year: 2026,
        organizationId: ids.org,
        clientId: ids.client,
        buildingId: ids.building,
        userId: ids.author,
      },
    });
    await prisma.document.create({
      data: {
        id: ids.document,
        title: 'Synthetic PMU',
        projectId: ids.project,
        content: { marker: 'content-reviewed' },
      },
    });
  });

  afterAll(async () => {
    await prisma.reviewObservation.deleteMany({ where: { projectId: ids.project } });
    await prisma.projectVersion.deleteMany({ where: { projectId: ids.project } });
    await prisma.document.deleteMany({ where: { projectId: ids.project } });
    await prisma.project.deleteMany({ where: { id: ids.project } });
    await prisma.building.deleteMany({ where: { id: ids.building } });
    await prisma.client.deleteMany({ where: { id: ids.client } });
    await prisma.user.deleteMany({
      where: { id: { in: [ids.author, ids.reviewer, ids.unassigned] } },
    });
    await prisma.organization.deleteMany({ where: { id: ids.org } });
    await prisma.$disconnect();
  });

  it('persists an observation from an unassigned operator through the real database', async () => {
    const observation = await approval.addObservation(
      ids.project,
      ids.unassigned,
      ids.org,
      { texte: 'Unauthorized synthetic observation' },
    );
    expect(observation.createdById).toBe(ids.unassigned);
    expect(
      await prisma.reviewObservation.count({ where: { projectId: ids.project } }),
    ).toBe(1);
  });

  it('moves an archived project back to review through submit', async () => {
    await prisma.project.update({
      where: { id: ids.project },
      data: { status: 'ARCHIVED' },
    });
    await expect(approval.submit(ids.project, author)).resolves.toMatchObject({
      status: 'REVIEW',
    });
    expect(
      await prisma.project.findUniqueOrThrow({ where: { id: ids.project } }),
    ).toMatchObject({ status: 'REVIEW', submittedById: ids.author });
  });

  it('approves content changed after submission without binding the approved version to that content', async () => {
    await prisma.document.update({
      where: { id: ids.document },
      data: {
        content: { marker: 'content-changed-after-submission' },
      },
    });
    await expect(
      approval.approve(ids.project, ids.reviewer, ids.org, 'ADMIN'),
    ).resolves.toMatchObject({ status: 'VALIDATED', version: 1 });

    const version = await prisma.projectVersion.findFirstOrThrow({
      where: { projectId: ids.project },
      orderBy: { versionNumber: 'desc' },
    });
    expect(version.snapshot).not.toMatchObject({
      documentId: ids.document,
      documentHash: expect.any(String),
    });
  });
});
