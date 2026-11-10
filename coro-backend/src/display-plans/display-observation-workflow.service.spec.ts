import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DisplayPermission } from '@prisma/client';
import { DisplayObservationWorkflowService } from './display-observation-workflow.service';

const actor = {
  userId: 'user-1',
  organizationId: 'org-1',
  role: 'USER',
} as never;

describe('DisplayObservationWorkflowService', () => {
  it('refuse une liste de bâtiments vide même avec la permission', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_READ],
          displayBuildingIds: [],
        }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.list('org-1', actor, { limit: 20, offset: 0 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse la réutilisation inter-observation d'une clé idempotente", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_QUALIFY],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ observationId: 'observation-2' }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.qualify('org-1', 'observation-1', actor, {
        expectedLockVersion: 0,
        requestId: 'request-unique',
        reason: 'Qualification professionnelle',
        professionalPriority: 'MAJOR',
        qualifiedCategory: 'DOCUMENT_ERROR',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse un message rejoué contre une autre observation', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_RESPOND],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservationMessage: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ observationId: 'observation-2' }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.message('org-1', 'observation-1', actor, {
        expectedLockVersion: 0,
        requestId: 'request-message',
        reason: 'Contexte requis',
        visibility: 'INTERNAL',
        message: 'Commentaire interne',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse une qualification fondée sur un verrou périmé', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_QUALIFY],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 2,
          status: 'SUBMITTED',
        }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.qualify('org-1', 'observation-1', actor, {
        expectedLockVersion: 1,
        requestId: 'request-stale',
        reason: 'Qualification concurrente',
        professionalPriority: 'MAJOR',
        qualifiedCategory: 'DOCUMENT_ERROR',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
