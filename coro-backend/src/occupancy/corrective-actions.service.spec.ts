import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CorrectiveActionsService } from './corrective-actions.service';

const corporate = {
  organizationId: 'org-a',
  role: 'CLIENT_CORPORATE',
  clientId: 'client-a',
};
const manager = {
  organizationId: 'org-a',
  role: 'CLIENT_MANAGER',
  clientId: 'client-a',
  buildingIds: ['building-a'],
};

function harness() {
  const correctiveAction = {
    create: jest.fn().mockResolvedValue({ id: 'action-a', status: 'PLANNED', category: 'GENERAL' }),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 'action-a' }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'action-a', status: 'COMPLETED' }),
  };
  const prisma: any = {
    building: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    correctiveAction,
    correctiveActionEvidence: { count: jest.fn().mockResolvedValue(0) },
    correctiveActionVerification: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'verification-a', attemptNumber: 1, verdict: 'ACCEPTED', verifiedAt: new Date() }),
    },
    correctiveActionAuditEvent: { create: jest.fn(), createMany: jest.fn() },
    clientUser: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    reviewRecommendation: { findFirst: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((callback: any) => callback(prisma)),
  };
  return { prisma, service: new CorrectiveActionsService(prisma as never) };
}

describe('CorrectiveActionsService tenant validation', () => {
  it('rejects a cross-tenant building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      h.service.create(
        { title: 'Action', buildingId: 'building-b' },
        corporate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a cross-tenant incident', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue(null);
    await expect(
      h.service.create(
        { title: 'Action', incidentId: 'incident-b' },
        corporate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an incident from another building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      buildingId: 'building-b',
    });
    await expect(
      h.service.create(
        { title: 'Action', buildingId: 'building-a', incidentId: 'incident-a' },
        corporate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an action when all references belong to the organization', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      buildingId: 'building-a',
    });
    await expect(
      h.service.create(
        { title: 'Action', buildingId: 'building-a', incidentId: 'incident-a' },
        corporate,
      ),
    ).resolves.toMatchObject({ id: 'action-a' });
  });

  it('limits a CLIENT_MANAGER list to accessible buildings', async () => {
    const h = harness();
    await h.service.getAll(manager);
    expect(h.prisma.correctiveAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
          buildingId: { in: ['building-a'] },
          building: { is: { clientId: 'client-a' } },
        }),
      }),
    );
  });

  it('rejects a CLIENT_MANAGER forbidden building', async () => {
    const h = harness();
    await expect(
      h.service.getAll(manager, 'building-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      h.service.create({ title: 'Action', buildingId: 'building-b' }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a CLIENT_MANAGER action on an accessible building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    await expect(
      h.service.create({ title: 'Action', buildingId: 'building-a' }, manager),
    ).resolves.toMatchObject({ id: 'action-a' });
    expect(h.prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-a',
          buildingId: 'building-a',
        }),
      }),
    );
  });

  it('derives and checks the building for an incident-only manager action', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      buildingId: 'building-a',
    });
    await h.service.create(
      { title: 'Action', incidentId: 'incident-a' },
      manager,
    );
    expect(h.prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buildingId: 'building-a' }),
      }),
    );
  });

  it('prevents direct-id update and delete outside manager building scope', async () => {
    const h = harness();
    h.prisma.correctiveAction.findFirst.mockResolvedValue(null);
    await expect(
      h.service.update('action-b', { title: 'Changed' }, manager),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(h.service.delete('action-b', manager)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(h.prisma.correctiveAction.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'action-b',
        organizationId: 'org-a',
        buildingId: { in: ['building-a'] },
        building: { is: { clientId: 'client-a' } },
      }),
    });
  });

  it('scopes corporate by client and keeps adviser access organization-wide', async () => {
    const h = harness();
    await h.service.getAll(corporate);
    await h.service.getAll({ organizationId: 'org-a', role: 'ADMIN' });
    expect(h.prisma.correctiveAction.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          building: { is: { clientId: 'client-a' } },
        }),
      }),
    );
    expect(h.prisma.correctiveAction.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.not.objectContaining({ buildingId: expect.anything() }),
      }),
    );
  });
});

describe('CorrectiveActionsService D1 workflow', () => {
  const actor = { ...manager, sub: 'user-a' };

  it('refuse une transition directe PLANNED vers COMPLETED', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_COMPLETE'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'PLANNED' });
    await expect(h.service.update('action-a', { status: 'COMPLETED' }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reouvre COMPLETED vers IN_PROGRESS et remet completedAt a null', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_COMPLETE'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'COMPLETED', completedAt: new Date() });
    await h.service.update('action-a', { status: 'IN_PROGRESS' }, actor);
    expect(h.prisma.correctiveAction.update.mock.calls[0][0].data.completedAt).toBeNull();
    expect(h.prisma.correctiveAction.update.mock.calls[0][0].data.completedById).toBeNull();
    expect(h.prisma.correctiveAction.update.mock.calls[0][0].data.completionComment).toBeNull();
  });

  it('refuse COMPLETED sans preuve active ni commentaire', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_COMPLETE'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'IN_PROGRESS' });
    await expect(h.service.complete('action-a', {}, actor)).rejects.toThrow('preuve active ou un commentaire');
  });

  it('complete avec commentaire et conserve l acteur reel', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_COMPLETE'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'IN_PROGRESS' });
    await h.service.complete('action-a', { completionComment: 'Travaux termines' }, actor);
    expect(h.prisma.correctiveAction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', completedByType: 'CLIENT_USER', completedById: 'user-a', completionComment: 'Travaux termines' }) }));
    expect(h.prisma.correctiveActionAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'COMPLETED', actorId: 'user-a' }) }));
  });

  it('complete avec une preuve ACTIVE sans commentaire', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_COMPLETE'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'IN_PROGRESS' });
    h.prisma.correctiveActionEvidence.count.mockResolvedValue(1);
    await expect(h.service.complete('action-a', {}, actor)).resolves.toMatchObject({ status: 'COMPLETED' });
  });

  it('refuse VERIFIED et CLOSED via le PUT generique', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_EDIT'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'COMPLETED' });
    await expect(h.service.update('action-a', { status: 'VERIFIED' } as any, actor)).rejects.toThrow('transition explicite');
  });

  it('respecte une permission explicite lorsqu elle est configuree', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_EDIT'] });
    await expect(h.service.create({ title: 'Action', buildingId: 'building-a' }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('considere une liste vide comme une revocation complete', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: [] });
    await expect(h.service.create({ title: 'Action', buildingId: 'building-a' }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cree depuis une Recommendation ACCEPTED avec intention idempotente et confidentialite heritee', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_CREATE'] });
    h.prisma.reviewRecommendation.findFirst.mockResolvedValue({ id: 'rec-a', operationalReview: { buildingId: 'building-a', confidentiality: 'BUILDING_TEAM' } });
    h.prisma.correctiveAction.findFirst.mockResolvedValue(null);
    const dto = { title: 'Action', clientIntentId: '11111111-1111-4111-8111-111111111111' };
    await h.service.createFromRecommendation('review-a', 'rec-a', dto, actor);
    expect(h.prisma.correctiveAction.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ reviewRecommendationId: 'rec-a', visibility: 'BUILDING_TEAM', status: 'PLANNED' }));
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', reviewRecommendationId: 'rec-a' });
    await h.service.createFromRecommendation('review-a', 'rec-a', dto, actor);
    expect(h.prisma.correctiveAction.create).toHaveBeenCalledTimes(1);
  });

  it('refuse une Recommendation non acceptee ou hors tenant', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_CREATE'] });
    h.prisma.reviewRecommendation.findFirst.mockResolvedValue(null);
    await expect(h.service.createFromRecommendation('review-a', 'rec-a', { title: 'Action', clientIntentId: '11111111-1111-4111-8111-111111111111' }, actor)).rejects.toThrow('acceptee introuvable');
  });

  it('resout le snapshot d un responsable CLIENT_USER cote serveur', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst
      .mockResolvedValueOnce({ correctiveActionPermissions: ['CORRECTIVE_ACTION_CREATE'] })
      .mockResolvedValueOnce({ id: 'assignee-a', firstName: 'Marie', lastName: 'Tremblay' });
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    await h.service.create({ title: 'Action', buildingId: 'building-a', assigneeType: 'CLIENT_USER' as any, assigneeId: '11111111-1111-4111-8111-111111111111' }, actor);
    expect(h.prisma.correctiveAction.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ assigneeDisplayNameSnapshot: 'Marie Tremblay', assignedTo: 'Marie Tremblay' }));
  });
});

describe('CorrectiveActionsService D3 verification and closure', () => {
  const verifier = { ...manager, sub: 'verifier-a' };

  it('exige explicitement CORRECTIVE_ACTION_VERIFY sans fallback legacy', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: [] });
    await expect(h.service.verify('action-a', { clientIntentId: '11111111-1111-4111-8111-111111111111', verdict: 'ACCEPTED', comment: 'Conforme' } as any, verifier)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('interdit l auto-verification du dernier completer', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_VERIFY'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'COMPLETED', completedByType: 'CLIENT_USER', completedById: 'verifier-a' });
    await expect(h.service.verify('action-a', { clientIntentId: '11111111-1111-4111-8111-111111111111', verdict: 'ACCEPTED', comment: 'Conforme' } as any, verifier)).rejects.toThrow('Auto-verification');
  });

  it('ACCEPTED produit VERIFIED et une verification immutable conceptuelle', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_VERIFY'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'COMPLETED', completedByType: 'CLIENT_USER', completedById: 'other' });
    h.prisma.correctiveActionEvidence.count.mockResolvedValue(1);
    h.prisma.correctiveAction.findUniqueOrThrow.mockResolvedValue({ id: 'action-a', status: 'VERIFIED' });
    await expect(h.service.verify('action-a', { clientIntentId: '11111111-1111-4111-8111-111111111111', verdict: 'ACCEPTED' } as any, verifier)).resolves.toMatchObject({ status: 'VERIFIED' });
    expect(h.prisma.correctiveAction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'VERIFIED', verifiedById: 'verifier-a' }) }));
  });

  it('REJECTED exige un commentaire et efface la completion courante', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_VERIFY'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'COMPLETED', completedById: 'other' });
    await expect(h.service.verify('action-a', { clientIntentId: '11111111-1111-4111-8111-111111111111', verdict: 'REJECTED' } as any, verifier)).rejects.toThrow('commentaire');
    h.prisma.correctiveActionVerification.create.mockResolvedValue({ id: 'verification-r', attemptNumber: 1, verdict: 'REJECTED', verifiedAt: new Date() });
    h.prisma.correctiveAction.findUniqueOrThrow.mockResolvedValue({ id: 'action-a', status: 'IN_PROGRESS' });
    await h.service.verify('action-a', { clientIntentId: '22222222-2222-4222-8222-222222222222', verdict: 'REJECTED', comment: 'Preuve insuffisante' } as any, verifier);
    expect(h.prisma.correctiveAction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'IN_PROGRESS', completedAt: null, completionComment: null }) }));
  });

  it('CLOSE exige sa permission et devient idempotent sans reecriture', async () => {
    const h = harness();
    h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: ['CORRECTIVE_ACTION_CLOSE'] });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'VERIFIED' });
    h.prisma.correctiveAction.findUniqueOrThrow.mockResolvedValue({ id: 'action-a', status: 'CLOSED' });
    await expect(h.service.close('action-a', {}, verifier)).resolves.toMatchObject({ status: 'CLOSED' });
    h.prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'action-a', organizationId: 'org-a', status: 'CLOSED', closedAt: new Date() });
    await h.service.close('action-a', {}, verifier);
    expect(h.prisma.correctiveAction.updateMany).toHaveBeenCalledTimes(1);
  });
});
