import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperationalReviewConfidentiality, OperationalReviewPermission, OperationalReviewStatus } from '@prisma/client';
import { OperationalReviewsService } from './operational-reviews.service';

const actor = { sub: 'user-1', organizationId: 'org-1', clientId: 'client-1', role: 'CLIENT_MANAGER', buildingIds: ['building-1'] };
const permissions = Object.values(OperationalReviewPermission);
const baseReview: any = {
  id: 'review-1', reference: 'REX-2026-000001', version: 1, status: OperationalReviewStatus.DRAFT,
  confidentiality: OperationalReviewConfidentiality.RESTRICTED, title: 'REX', summary: null,
  buildingId: 'building-1', projectId: null, populationOperationalEventId: 'event-1',
  populationEvidenceRecordId: 'evidence-1', incidentEventId: null, exerciseReportId: null,
  createdByType: 'CLIENT_USER', createdById: 'user-1', submittedAt: null, submittedByType: null,
  submittedById: null, finalizedAt: null, finalizedByType: null, finalizedById: null,
  populationEvidenceRecord: { reference: 'CORO-SP-2026-000001', version: 1 }, auditEvents: [],
};

function setup(userPermissions = permissions) {
  const tx: any = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    operationalReview: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(baseReview), update: jest.fn() },
  };
  const prisma: any = {
    clientUser: { findFirst: jest.fn().mockResolvedValue({ operationalReviewPermissions: userPermissions }) },
    building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-1', clientId: 'client-1' }) },
    populationOperationalEvent: { findFirst: jest.fn().mockResolvedValue({ id: 'event-1', program: { rueFacilityProfile: { buildingId: 'building-1' } }, evidenceRecords: [{ id: 'evidence-1' }] }) },
    incidentEvent: { findFirst: jest.fn().mockResolvedValue({ id: 'incident-1', buildingId: 'building-1' }) },
    exerciseReport: { findFirst: jest.fn().mockResolvedValue({ id: 'exercise-1', buildingId: 'building-1', projectId: 'project-1' }) },
    operationalReview: { findFirst: jest.fn().mockResolvedValue(baseReview), update: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  return { prisma, tx, service: new OperationalReviewsService(prisma) };
}

describe('OperationalReviewsService', () => {
  it('exige une permission REX independante', async () => {
    const { service } = setup([]);
    await expect(service.create({ title: 'REX', buildingId: 'building-1', populationOperationalEventId: 'event-1' }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige exactement une source principale', async () => {
    const { service } = setup();
    await expect(service.create({ title: 'REX' }, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ title: 'REX', populationOperationalEventId: 'event-1', incidentEventId: 'incident-1' }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cree un REX Population ENDED et associe Evidence sans copier son snapshot', async () => {
    const { service, tx } = setup();
    const result = await service.create({ title: 'REX', buildingId: 'building-1', populationOperationalEventId: 'event-1' }, actor);
    expect(result).toMatchObject({ reference: 'REX-2026-000001', evidenceRecordId: 'evidence-1', evidenceReference: 'CORO-SP-2026-000001' });
    expect(tx.operationalReview.create.mock.calls[0][0].data).not.toHaveProperty('snapshot');
    expect(tx.operationalReview.create.mock.calls[0][0].data.auditEvents.create).toMatchObject({ type: 'CREATED', actorId: 'user-1' });
  });

  it('autorise un REX Population sans Evidence finalisee', async () => {
    const { service, prisma, tx } = setup();
    prisma.populationOperationalEvent.findFirst.mockResolvedValue({ id: 'event-1', program: { rueFacilityProfile: { buildingId: 'building-1' } }, evidenceRecords: [] });
    await service.create({ title: 'REX', populationOperationalEventId: 'event-1' }, actor);
    expect(tx.operationalReview.create.mock.calls[0][0].data.populationEvidenceRecordId).toBeNull();
  });

  it('refuse une source Population non terminee ou hors tenant', async () => {
    const { service, prisma } = setup();
    prisma.populationOperationalEvent.findFirst.mockResolvedValue(null);
    await expect(service.create({ title: 'REX', populationOperationalEventId: 'event-1' }, actor)).rejects.toThrow('termine');
  });

  it('cree depuis un Incident termine sans recopier son journal legacy', async () => {
    const { service, tx } = setup();
    await service.create({ title: 'REX incident', incidentEventId: 'incident-1' }, actor);
    const data = tx.operationalReview.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ incidentEventId: 'incident-1', populationEvidenceRecordId: null });
    expect(data).not.toHaveProperty('journal');
  });

  it('cree depuis un ExerciseReport PUBLISHED avec son projet', async () => {
    const { service, tx } = setup();
    await service.create({ title: 'REX exercice', exerciseReportId: 'exercise-1' }, actor);
    expect(tx.operationalReview.create.mock.calls[0][0].data).toMatchObject({ exerciseReportId: 'exercise-1', projectId: 'project-1' });
  });

  it('retourne le meme v1 lors d une creation idempotente', async () => {
    const { service, tx } = setup();
    tx.operationalReview.findFirst.mockResolvedValue(baseReview);
    const result = await service.create({ title: 'Autre titre', populationOperationalEventId: 'event-1' }, actor);
    expect(result.id).toBe('review-1');
    expect(tx.operationalReview.create).not.toHaveBeenCalled();
  });

  it('refuse un building DTO different de la source', async () => {
    const { service } = setup();
    await expect(service.create({ title: 'REX', buildingId: 'building-2', populationOperationalEventId: 'event-1' }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse une lecture par reviewId hors organisation', async () => {
    const { service, prisma } = setup();
    prisma.operationalReview.findFirst.mockResolvedValue(null);
    await expect(service.get('foreign-review', actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.operationalReview.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign-review', organizationId: 'org-1' } }));
  });

  it('retrouve le REX depuis evenement Population et reapplique tout le scope', async () => {
    const { service, prisma } = setup();
    prisma.operationalReview.findFirst.mockResolvedValueOnce({ id: 'review-1' }).mockResolvedValueOnce(baseReview);
    await expect(service.getForPopulationEvent('event-1', actor)).resolves.toMatchObject({ id: 'review-1', populationOperationalEventId: 'event-1' });
    expect(prisma.operationalReview.findFirst.mock.calls[0][0].where).toEqual(expect.objectContaining({ organizationId: 'org-1', populationOperationalEventId: 'event-1', version: 1 }));
  });

  it('retourne null sans divulgation lorsqu aucun REX evenementiel existe', async () => {
    const { service, prisma } = setup();
    prisma.operationalReview.findFirst.mockResolvedValue(null);
    await expect(service.getForPopulationEvent('event-absent', actor)).resolves.toBeNull();
  });

  it('applique les restrictions batiment au portail client', async () => {
    const { service, prisma } = setup();
    prisma.building.findFirst.mockResolvedValue({ id: 'building-1', clientId: 'other-client' });
    await expect(service.get('review-1', { ...actor, buildingIds: [] })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applique RESTRICTED et ne donne aucun droit implicite au createur', async () => {
    const { service, prisma } = setup([OperationalReviewPermission.REX_CREATE]);
    prisma.operationalReview.findFirst.mockResolvedValue({ ...baseReview, createdById: actor.sub });
    await expect(service.get('review-1', actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise un reviewer a consulter RESTRICTED', async () => {
    const { service, prisma } = setup([OperationalReviewPermission.REX_REVIEW]);
    prisma.operationalReview.findFirst.mockResolvedValue({ ...baseReview, createdById: 'other-user' });
    await expect(service.get('review-1', actor)).resolves.toMatchObject({ id: 'review-1' });
  });

  it('expose uniquement le blocage de verification propre a l acteur, sans identifiants', async () => {
    const { service, prisma } = setup();
    const action = (id: string, completedById: string, assigneeId: string | null = null) => ({
      id, status: 'COMPLETED', completedByType: 'CLIENT_USER', completedById,
      assigneeType: assigneeId ? 'CLIENT_USER' : null, assigneeId,
    });
    prisma.operationalReview.findFirst.mockResolvedValue({
      ...baseReview,
      findings: [{ id: 'finding-1', recommendations: [{ id: 'rec-1', correctiveActions: [
        action('self-completer', 'user-1'), action('self-assignee', 'other-user', 'user-1'), action('other', 'other-user'),
      ] }] }],
    });
    const result = await service.get('review-1', actor);
    const actions = result.findings[0].recommendations[0].correctiveActions;
    expect(actions.map((item: any) => item.verificationBlockedForCurrentUser)).toEqual([true, true, false]);
    for (const item of actions) {
      expect(item).not.toHaveProperty('completedById');
      expect(item).not.toHaveProperty('completedByType');
      expect(item).not.toHaveProperty('assigneeId');
      expect(item).not.toHaveProperty('assigneeType');
    }
  });

  it('interdit ADVISOR depuis le canal Client Portal', async () => {
    const { service, prisma } = setup();
    await expect(service.create({ title: 'REX', confidentiality: OperationalReviewConfidentiality.ADVISOR, populationOperationalEventId: 'event-1' }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    prisma.operationalReview.findFirst.mockResolvedValue({ ...baseReview, confidentiality: OperationalReviewConfidentiality.ADVISOR });
    await expect(service.get('review-1', actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('edite un DRAFT et inscrit acteur et champs SAFE dans audit', async () => {
    const { service, prisma } = setup();
    prisma.operationalReview.update.mockResolvedValue({ ...baseReview, title: 'Nouveau titre' });
    await service.update('review-1', { title: 'Nouveau titre' }, actor);
    expect(prisma.operationalReview.update.mock.calls[0][0].data.auditEvents.create).toEqual(expect.objectContaining({ type: 'UPDATED', actorId: 'user-1', metadata: { fields: ['title'] } }));
  });

  it('soumet puis finalise avec acteur reel et audit', async () => {
    const { service, prisma, tx } = setup();
    prisma.operationalReview.update
      .mockResolvedValueOnce({ ...baseReview, status: OperationalReviewStatus.IN_REVIEW })
      .mockResolvedValueOnce({ ...baseReview, status: OperationalReviewStatus.FINALIZED });
    await service.submit('review-1', actor);
    expect(prisma.operationalReview.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: OperationalReviewStatus.IN_REVIEW, submittedById: 'user-1' }));
    expect(prisma.operationalReview.update.mock.calls[0][0].data.auditEvents.create.type).toBe('SUBMITTED');
    prisma.operationalReview.findFirst.mockResolvedValue({ ...baseReview, status: OperationalReviewStatus.IN_REVIEW });
    tx.operationalReview.findFirst.mockResolvedValue({ ...baseReview, status: OperationalReviewStatus.IN_REVIEW });
    tx.operationalReview.update.mockResolvedValue({ ...baseReview, status: OperationalReviewStatus.FINALIZED });
    await service.finalize('review-1', actor);
    expect(tx.operationalReview.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: OperationalReviewStatus.FINALIZED, finalizedById: 'user-1' }));
    expect(tx.operationalReview.update.mock.calls[0][0].data.auditEvents.create.type).toBe('FINALIZED');
    expect(tx.$queryRaw).toHaveBeenCalled();
  });

  it('rend la finalisation repetee idempotente', async () => {
    const { service, prisma, tx } = setup();
    prisma.operationalReview.findFirst.mockResolvedValue({ ...baseReview, status: OperationalReviewStatus.FINALIZED });
    tx.operationalReview.findFirst.mockResolvedValue({ ...baseReview, status: OperationalReviewStatus.FINALIZED });
    await expect(service.finalize('review-1', actor)).resolves.toMatchObject({ status: OperationalReviewStatus.FINALIZED });
    expect(tx.operationalReview.update).not.toHaveBeenCalled();
  });

  it('refuse toute edition apres finalisation', async () => {
    const { service, prisma } = setup();
    prisma.operationalReview.findFirst.mockResolvedValue({ ...baseReview, status: OperationalReviewStatus.FINALIZED });
    await expect(service.update('review-1', { title: 'Mutation' }, actor)).rejects.toBeInstanceOf(ConflictException);
  });
});
