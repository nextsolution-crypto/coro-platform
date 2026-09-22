import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CorrectiveActionPermission, OperationalReviewConfidentiality, OperationalReviewStatus } from '@prisma/client';
import { CorrectiveActionTrackingReportService } from './corrective-action-tracking-report.service';

const intent = '412045fe-f2b2-43eb-85d1-a02fa10a7412';
const actor = { sub: 'user', organizationId: 'org', role: 'CLIENT_MANAGER', buildingIds: ['building'] };

function setup() {
  const review = { id: 'review', reference: 'REX-2026-000001', version: 1, status: OperationalReviewStatus.FINALIZED, organizationId: 'org' };
  const prisma: any = {
    organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Organization' }) },
    building: { findUnique: jest.fn().mockResolvedValue({ name: 'Building' }) },
    clientUser: { findFirst: jest.fn().mockResolvedValue({ correctiveActionPermissions: [CorrectiveActionPermission.CORRECTIVE_ACTION_REPORT_GENERATE] }) },
    operationalReview: { findFirst: jest.fn().mockResolvedValue({ ...review, title: 'REX', confidentiality: OperationalReviewConfidentiality.BUILDING_TEAM, finalizedAt: new Date(), recommendations: [{ id: 'rec', displayOrder: 1, title: 'Recommendation', status: 'ACCEPTED', reviewFinding: { displayOrder: 1, title: 'Finding' } }] }) },
    correctiveAction: { findMany: jest.fn().mockResolvedValue([{ reviewRecommendationId: 'rec', reference: 'AC-2026-000001', title: 'Action', description: 'Description', priority: 'WARNING', status: 'CANCELLED', visibility: OperationalReviewConfidentiality.BUILDING_TEAM, assigneeType: null, assigneeDisplayNameSnapshot: 'Person', dueDate: null, createdAt: new Date(), completedAt: null, verifiedAt: null, closedAt: null, completionComment: null, closureComment: null, evidence: [{ status: 'ACTIVE', type: 'NOTE', title: 'Note', submittedAt: new Date(), fileSize: null, sha256: null }, { status: 'WITHDRAWN', type: 'LINK', title: 'Old', submittedAt: new Date(), fileSize: null, sha256: null }], verifications: [{ attemptNumber: 1, verdict: 'REJECTED', comment: 'Rework', verifiedAt: new Date(), verifiedByType: 'CLIENT_USER' }] }]) },
    correctiveActionTrackingReport: { findUnique: jest.fn().mockResolvedValue(null), aggregate: jest.fn().mockResolvedValue({ _max: { reportVersion: null } }), create: jest.fn().mockImplementation(({ data }: any) => ({ ...data, id: 'report', status: 'SNAPSHOT_READY', createdAt: new Date() })), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    $executeRaw: jest.fn(),
  };
  prisma.$transaction = jest.fn((callback: any) => callback(prisma));
  const reviews: any = { authorizeReport: jest.fn().mockResolvedValue(review) };
  return { service: new CorrectiveActionTrackingReportService(prisma, reviews), prisma, reviews };
}

describe('CorrectiveActionTrackingReportService', () => {
  it('refuse sans permission explicite et si le REX n est pas finalise', async () => {
    const h = setup();
    h.prisma.clientUser.findFirst.mockResolvedValueOnce({ correctiveActionPermissions: [] });
    await expect(h.service.create('review', intent, actor)).rejects.toBeInstanceOf(ForbiddenException);
    h.reviews.authorizeReport.mockResolvedValueOnce({ status: 'DRAFT' });
    await expect(h.service.create('review', intent, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('capture les annulations et preuves actives sans contenu ni identifiants', async () => {
    const h = setup();
    const result = await h.service.create('review', intent, actor);
    expect(result).toMatchObject({ reportVersion: 1, status: 'SNAPSHOT_READY', actionCount: 1 });
    const data = h.prisma.correctiveActionTrackingReport.create.mock.calls[0][0].data.renderData;
    expect(data.actions[0]).toMatchObject({ status: 'CANCELLED', withdrawnEvidenceCount: 1, evidence: [{ type: 'NOTE', title: 'Note' }], verifications: [{ attemptNumber: 1, verdict: 'REJECTED' }] });
    expect(JSON.stringify(data)).not.toMatch(/storageKey|noteText|externalUrl|assigneeId|verifiedById|clientIntentId/);
    expect(JSON.stringify(result)).not.toContain('renderData');
  });

  it('rejoue la meme intention sans recalculer et attribue la version suivante a une autre', async () => {
    const h = setup();
    const first = await h.service.create('review', intent, actor);
    h.prisma.correctiveActionTrackingReport.findUnique.mockResolvedValueOnce({ ...first, operationalReviewId: 'review', renderData: { actions: [{}] } });
    await expect(h.service.create('review', intent, actor)).resolves.toMatchObject({ reportVersion: 1 });
    expect(h.prisma.correctiveActionTrackingReport.create).toHaveBeenCalledTimes(1);
    h.prisma.correctiveActionTrackingReport.aggregate.mockResolvedValueOnce({ _max: { reportVersion: 1 } });
    await expect(h.service.create('review', '412045fe-f2b2-43eb-85d1-a02fa10a7413', actor)).resolves.toMatchObject({ reportVersion: 2 });
  });

  it('refuse une visibilite action plus large ou differente', async () => {
    const h = setup();
    h.prisma.correctiveAction.findMany.mockResolvedValueOnce([{ visibility: OperationalReviewConfidentiality.RESTRICTED }]);
    await expect(h.service.create('review', intent, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revalide le scope en lecture et refuse une version inconnue', async () => {
    const h = setup();
    await expect(h.service.get('review', 2, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.reviews.authorizeReport).toHaveBeenCalledWith('review', actor);
  });
});
