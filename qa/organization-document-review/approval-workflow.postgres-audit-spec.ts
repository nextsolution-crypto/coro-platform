import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, DocumentType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ApprovalService } from '../../coro-backend/src/approval/approval.service';

jest.mock('../../coro-backend/src/export/export.service', () => ({ ExportService: class ExportService {} }));

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL jetable est obligatoire');

describe('Governed document review PostgreSQL acceptance', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const suffix = randomUUID();
  const org = `review-org-${suffix}`;
  const authorId = `review-author-${suffix}`;
  const reviewerId = `review-reviewer-${suffix}`;
  const unassignedId = `review-unassigned-${suffix}`;
  const clientId = `review-client-${suffix}`;
  const buildingId = `review-building-${suffix}`;
  const types: DocumentType[] = ['PMU', 'PSI', 'PCA'];
  const projects = types.map((type) => ({ type, projectId: `review-${type}-${suffix}`, documentId: `review-document-${type}-${suffix}` }));
  const author = { userId: authorId, organizationId: org, role: 'OPERATOR' };
  const reviewer = { userId: reviewerId, organizationId: org, role: 'ADMIN' };
  const unassigned = { userId: unassignedId, organizationId: org, role: 'OPERATOR' };
  const service = new ApprovalService(
    prisma as any,
    { create: jest.fn().mockResolvedValue({}), createForOrganization: jest.fn().mockResolvedValue({}) } as any,
    { sendDocumentAvailable: jest.fn().mockResolvedValue({}) } as any,
    { generatePdf: jest.fn(() => new Promise(() => undefined)) } as any,
    { uploadFile: jest.fn() } as any,
  );

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({ data: { id: org, name: 'Review QA Org' } });
    await prisma.user.createMany({ data: [
      { id: authorId, email: `${authorId}@example.invalid`, password: 'synthetic', firstName: 'Author', lastName: 'Synthetic', role: 'OPERATOR', organizationId: org },
      { id: reviewerId, email: `${reviewerId}@example.invalid`, password: 'synthetic', firstName: 'Reviewer', lastName: 'Synthetic', role: 'ADMIN', organizationId: org },
      { id: unassignedId, email: `${unassignedId}@example.invalid`, password: 'synthetic', firstName: 'Unassigned', lastName: 'Synthetic', role: 'OPERATOR', organizationId: org },
    ] });
    await prisma.client.create({ data: { id: clientId, name: 'Review QA Client', organizationId: org, regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: buildingId, name: 'Review QA Building', address: '1 Synthetic', city: 'Montreal', province: 'QC', organizationId: org, clientId } });
    for (const item of projects) {
      await prisma.project.create({ data: { id: item.projectId, name: `Review QA ${item.type}`, documentType: item.type, year: 2026, organizationId: org, clientId, buildingId, userId: authorId } });
      await prisma.document.create({ data: { id: item.documentId, title: `Synthetic ${item.type}`, projectId: item.projectId, content: { type: item.type, safe: '<script>not executable</script>' } } });
    }
  });

  afterAll(async () => {
    const projectIds = projects.map((item) => item.projectId);
    await prisma.documentReviewNotificationEvent.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.reviewObservation.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectVersion.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.auditLog.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.documentReviewRequest.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.document.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.building.deleteMany({ where: { id: buildingId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [authorId, reviewerId, unassignedId] } } });
    await prisma.organization.deleteMany({ where: { id: org } });
    await prisma.$disconnect();
  });

  it('rejects archived submission and out-of-scope observations with zero side effects', async () => {
    const item = projects[0];
    await prisma.project.update({ where: { id: item.projectId }, data: { status: 'ARCHIVED' } });
    await expect(service.submit(item.projectId, author)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.addObservation(item.projectId, unassigned, { texte: 'blocked' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.documentReviewRequest.count({ where: { projectId: item.projectId } })).toBe(0);
    expect(await prisma.reviewObservation.count({ where: { projectId: item.projectId } })).toBe(0);
    await prisma.project.update({ where: { id: item.projectId }, data: { status: 'DRAFT' } });
  });

  it.each(projects)('executes immutable submission and approval for $type', async (item) => {
    const submitted = await service.submit(item.projectId, author);
    expect(submitted).toMatchObject({ status: 'REVIEW', documentVersion: 1 });
    expect(await service.canApprove(item.projectId, unassigned)).toBeNull();
    expect(await service.canApprove(item.projectId, reviewer)).toMatchObject({ id: submitted.reviewRequestId });
    const observation = await service.addObservation(item.projectId, reviewer, { texte: `Review ${item.type}` });
    expect(observation.projectId).toBe(item.projectId);

    const decisions = await Promise.all([
      service.approve(item.projectId, reviewer),
      service.approve(item.projectId, reviewer),
    ]);
    expect(decisions.some((decision) => decision.replayed === true)).toBe(true);
    expect(await prisma.projectVersion.count({ where: { projectId: item.projectId } })).toBe(1);
    const version = await prisma.projectVersion.findFirstOrThrow({ where: { projectId: item.projectId } });
    expect(version.snapshot).toMatchObject({ reviewRequestId: submitted.reviewRequestId, documentId: item.documentId, contentHash: submitted.contentHash });
    expect(await prisma.auditLog.count({ where: { projectId: item.projectId, entityType: 'DOCUMENT_REVIEW' } })).toBe(2);
  });

  it('rejects approval when content changes after submission and permits governed correction/resubmission', async () => {
    const item = projects[0];
    await service.requestRevision(item.projectId, reviewer, 'Nouvelle révision synthétique');
    await prisma.document.update({ where: { id: item.documentId }, data: { content: { changed: true }, lockVersion: { increment: 1 } } });
    const resubmitted = await service.submit(item.projectId, author);
    await prisma.document.update({ where: { id: item.documentId }, data: { content: { changedAgain: true }, lockVersion: { increment: 1 } } });
    await expect(service.approve(item.projectId, reviewer)).rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.projectVersion.count({ where: { projectId: item.projectId } })).toBe(1);
    expect(await prisma.documentReviewRequest.findUniqueOrThrow({ where: { id: resubmitted.reviewRequestId } })).toMatchObject({ status: 'PENDING' });
  });
});
