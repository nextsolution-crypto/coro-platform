import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 0,
          status: 'SUBMITTED',
        }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.qualify('org-1', 'observation-1', actor, {
        expectedLockVersion: 0,
        requestId: 'request-unique',
        reason: 'Qualification professionnelle',
        professionalPriority: 'MAJOR',
        qualifiedCategory: 'DOCUMENT_INFORMATION_INCORRECT',
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
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 0,
          status: 'SUBMITTED',
        }),
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
        qualifiedCategory: 'DOCUMENT_INFORMATION_INCORRECT',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('revérifie le périmètre avant de rejouer une requête idempotente', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_QUALIFY],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ observationId: 'observation-1' }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.qualify('org-1', 'observation-1', actor, {
        expectedLockVersion: 0,
        requestId: 'request-revoked',
        reason: 'Reprise après révocation',
        professionalPriority: 'MINOR',
        qualifiedCategory: 'OTHER',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      prisma.displayCorrectionObservationEvent.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('refuse toute nouvelle mutation après la clôture', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_QUALIFY],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 7,
          status: 'CLOSED',
        }),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.qualify('org-1', 'observation-1', actor, {
        expectedLockVersion: 7,
        requestId: 'request-after-close',
        reason: 'Tentative postérieure',
        professionalPriority: 'MINOR',
        qualifiedCategory: 'OTHER',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige une preuve lorsque la référence est ajoutée pendant la résolution', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_RESOLVE],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 3,
          status: 'ACCEPTED',
          correctionReferenceId: null,
          correctionEvidence: null,
          decidedByUserId: 'user-2',
          clientVisibleResponse: null,
        }),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: never) => unknown) =>
          callback({
            displayCorrectionObservation: { updateMany: jest.fn() },
          } as never),
        ),
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.transition('org-1', 'observation-1', actor, {
        expectedLockVersion: 3,
        requestId: 'request-proof',
        reason: 'Résolution proposée',
        toStatus: 'RESOLVED',
        correctionReferenceType: 'TASK',
        correctionReferenceId: 'TASK-42',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige une preuve pour toute résolution, même sans référence documentaire', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_RESOLVE],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 3,
          status: 'ACCEPTED',
          correctionReferenceId: null,
          correctionEvidence: null,
          decidedByUserId: 'user-2',
          clientVisibleResponse: null,
        }),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: never) => unknown) =>
          callback({
            displayCorrectionObservation: { updateMany: jest.fn() },
          } as never),
        ),
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.transition('org-1', 'observation-1', actor, {
        expectedLockVersion: 3,
        requestId: 'request-proof-without-reference',
        reason: 'Résolution proposée',
        toStatus: 'RESOLVED',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impose un second professionnel pour valider toute résolution', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_RESOLVE],
          displayBuildingIds: ['building-1'],
        }),
      },
      displayCorrectionObservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'observation-1',
          organizationId: 'org-1',
          buildingId: 'building-1',
          lockVersion: 3,
          status: 'ACCEPTED',
          correctionReferenceId: null,
          correctionEvidence: null,
          decidedByUserId: 'user-1',
          clientVisibleResponse: null,
        }),
      },
      displayCorrectionObservationEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: never) => unknown) =>
          callback({
            displayCorrectionObservation: { updateMany: jest.fn() },
          } as never),
        ),
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.transition('org-1', 'observation-1', actor, {
        expectedLockVersion: 3,
        requestId: 'request-separation',
        reason: 'Validation indépendante',
        toStatus: 'RESOLVED',
        correctionEvidence: 'Preuve documentaire contrôlée',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse le HTML et les scripts dans les messages professionnels', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_RESPOND],
          displayBuildingIds: ['building-1'],
        }),
      },
    };
    const service = new DisplayObservationWorkflowService(prisma as never);
    await expect(
      service.message('org-1', 'observation-1', actor, {
        expectedLockVersion: 0,
        requestId: 'request-xss',
        reason: 'Contrôle de contenu',
        visibility: 'INTERNAL',
        message: '<script>alert(1)</script>',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
