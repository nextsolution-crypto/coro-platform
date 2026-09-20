import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperationalReviewPermission, OperationalReviewStatus, ReviewFindingCategory, ReviewFindingSeverity, ReviewFindingStatus, ReviewRecommendationStatus } from '@prisma/client';
import { OperationalReviewsService } from './operational-reviews.service';

const actor = { sub: 'user-1', organizationId: 'org-1', clientId: 'client-1', role: 'CLIENT_MANAGER', buildingIds: ['building-1'] };
const review = { id: 'review-1', organizationId: 'org-1', status: OperationalReviewStatus.DRAFT, confidentiality: 'BUILDING_TEAM', buildingId: 'building-1', createdById: 'user-1', populationEvidenceRecord: null, auditEvents: [], findings: [] };
const finding = { id: 'finding-1', organizationId: 'org-1', operationalReviewId: 'review-1', category: ReviewFindingCategory.GAP, severity: ReviewFindingSeverity.HIGH, status: ReviewFindingStatus.OPEN, displayOrder: 1 };
const recommendation = { id: 'rec-1', organizationId: 'org-1', operationalReviewId: 'review-1', reviewFindingId: 'finding-1', status: ReviewRecommendationStatus.PROPOSED, displayOrder: 1 };

function setup(status: OperationalReviewStatus = OperationalReviewStatus.DRAFT, permissions = Object.values(OperationalReviewPermission)) {
  const currentReview = { ...review, status };
  const tx: any = {
    $executeRaw: jest.fn(),
    reviewFinding: { aggregate: jest.fn().mockResolvedValue({ _max: { displayOrder: 2 } }), create: jest.fn().mockResolvedValue({ ...finding, displayOrder: 3 }), update: jest.fn().mockResolvedValue(finding), delete: jest.fn() },
    reviewRecommendation: { aggregate: jest.fn().mockResolvedValue({ _max: { displayOrder: 4 } }), create: jest.fn().mockResolvedValue({ ...recommendation, displayOrder: 5 }), update: jest.fn().mockResolvedValue(recommendation), delete: jest.fn() },
    operationalReviewAuditEvent: { create: jest.fn() },
  };
  const prisma: any = {
    clientUser: { findFirst: jest.fn().mockResolvedValue({ operationalReviewPermissions: permissions }) },
    building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-1', clientId: 'client-1' }) },
    operationalReview: { findFirst: jest.fn().mockResolvedValue(currentReview) },
    reviewFinding: { findFirst: jest.fn().mockResolvedValue(finding) },
    reviewRecommendation: { findFirst: jest.fn().mockResolvedValue(recommendation) },
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  return { service: new OperationalReviewsService(prisma), prisma, tx };
}

describe('OperationalReview findings and recommendations', () => {
  it('cree un Finding ordonne et audite en DRAFT', async () => {
    const { service, tx } = setup();
    const result = await service.createFinding('review-1', { category: ReviewFindingCategory.GAP, title: 'Ecart', description: 'Description', severity: ReviewFindingSeverity.HIGH }, actor);
    expect(result.displayOrder).toBe(3);
    expect(tx.operationalReviewAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'FINDING_CREATED', reviewId: 'review-1' }) });
  });

  it('modifie et supprime un Finding uniquement en DRAFT avec audit', async () => {
    const { service, tx } = setup();
    await service.updateFinding('review-1', 'finding-1', { title: 'Corrige' }, actor);
    expect(tx.operationalReviewAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'FINDING_UPDATED' }) });
    await service.deleteFinding('review-1', 'finding-1', actor);
    expect(tx.reviewFinding.delete).toHaveBeenCalledWith({ where: { id: 'finding-1' } });
  });

  it('refuse la suppression Finding en IN_REVIEW', async () => {
    const { service } = setup(OperationalReviewStatus.IN_REVIEW);
    await expect(service.deleteFinding('review-1', 'finding-1', actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('decide le statut Finding en IN_REVIEW avec acteur', async () => {
    const { service, tx } = setup(OperationalReviewStatus.IN_REVIEW);
    await service.changeFindingStatus('review-1', 'finding-1', { status: ReviewFindingStatus.ACCEPTED }, actor);
    expect(tx.reviewFinding.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: ReviewFindingStatus.ACCEPTED, acceptedById: 'user-1' }));
  });

  it('refuse toute mutation enfant quand le parent est FINALIZED', async () => {
    const { service } = setup(OperationalReviewStatus.FINALIZED);
    await expect(service.createFinding('review-1', { category: ReviewFindingCategory.OBSERVATION, title: 'Observation', description: 'Description', severity: ReviewFindingSeverity.INFORMATIONAL }, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cree une Recommendation sur le Finding du meme Review et l ordonne', async () => {
    const { service, tx } = setup();
    const result = await service.createRecommendation('review-1', 'finding-1', { description: 'Ameliorer' }, actor);
    expect(result.displayOrder).toBe(5);
    expect(tx.operationalReviewAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'RECOMMENDATION_CREATED' }) });
  });

  it('refuse un Finding appartenant a un autre Review ou tenant', async () => {
    const { service, prisma } = setup();
    prisma.reviewFinding.findFirst.mockResolvedValue(null);
    await expect(service.createRecommendation('review-1', 'foreign-finding', { description: 'Non' }, actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('modifie, decide et supprime une Recommendation selon le statut parent', async () => {
    const draft = setup();
    await draft.service.updateRecommendation('review-1', 'rec-1', { description: 'Corrigee' }, actor);
    await draft.service.deleteRecommendation('review-1', 'rec-1', actor);
    expect(draft.tx.reviewRecommendation.delete).toHaveBeenCalled();
    const inReview = setup(OperationalReviewStatus.IN_REVIEW);
    await inReview.service.decideRecommendation('review-1', 'rec-1', { status: ReviewRecommendationStatus.DEFERRED, decisionComment: 'Plus tard' }, actor);
    expect(inReview.tx.reviewRecommendation.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: ReviewRecommendationStatus.DEFERRED, decidedById: 'user-1' }));
  });

  it('refuse PROPOSED comme decision de Recommendation', async () => {
    const { service } = setup(OperationalReviewStatus.IN_REVIEW);
    await expect(service.decideRecommendation('review-1', 'rec-1', { status: ReviewRecommendationStatus.PROPOSED }, actor)).rejects.toThrow('etat initial');
  });

  it('applique la permission REX_EDIT aux mutations DRAFT', async () => {
    const { service } = setup(OperationalReviewStatus.DRAFT, [OperationalReviewPermission.REX_REVIEW]);
    await expect(service.createFinding('review-1', { category: ReviewFindingCategory.GAP, title: 'Ecart', description: 'Description', severity: ReviewFindingSeverity.HIGH }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('herite la confidentialite et le scope du Review parent', async () => {
    const { service, prisma } = setup();
    prisma.building.findFirst.mockResolvedValue({ id: 'building-1', clientId: 'other-client' });
    await expect(service.createFinding('review-1', { category: ReviewFindingCategory.RISK, title: 'Risque', description: 'Description', severity: ReviewFindingSeverity.MEDIUM }, { ...actor, buildingIds: [] })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
