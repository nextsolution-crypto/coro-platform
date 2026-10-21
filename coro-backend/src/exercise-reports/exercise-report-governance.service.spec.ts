import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ExerciseReportStatus, PlatformPermission } from '@prisma/client';
import { ExerciseReportGovernanceService } from './exercise-report-governance.service';

const actor = { userId: 'user-1', organizationId: 'org-1', role: 'OPERATOR' };
const dto = {
  lockVersion: 2,
  requestId: '11111111-1111-4111-8111-111111111111',
  reason: 'Governed QA transition',
};
const report = {
  id: 'report-1',
  organizationId: 'org-1',
  buildingId: 'building-1',
  projectId: 'project-1',
  status: ExerciseReportStatus.DRAFT,
  lockVersion: 2,
  versions: [],
  auditEvents: [],
  participants: [],
  timelineEntries: [],
  findings: [],
  recommendations: [],
  actionItems: [],
  project: {},
};

function harness(current: any = report) {
  const tx: any = {
    $executeRaw: jest.fn(),
    exerciseReport: {
      findFirst: jest.fn().mockResolvedValue(current),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        ...current,
        status: ExerciseReportStatus.IN_REVIEW,
        lockVersion: 3,
      }),
    },
    exerciseReportAuditEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    exerciseReportVersion: { create: jest.fn() },
    exerciseReportTemplateVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    exerciseReportTemplateAuditEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
  };
  const prisma: any = {
    $transaction: jest.fn((work: any) => work(tx)),
    exerciseReport: { findFirst: jest.fn().mockResolvedValue(current) },
    exerciseReportTemplateVersion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    correctiveAction: { findMany: jest.fn() },
    customerPortfolioAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    customerPortfolioBuildingMembership: { findMany: jest.fn() },
  };
  const storage: any = {
    uploadPrivateImmutable: jest.fn(),
    downloadPrivate: jest
      .fn()
      .mockRejectedValue(new Error('PRIVATE_OBJECT_NOT_FOUND')),
  };
  const authority: any = {
    requirePermission: jest.fn().mockResolvedValue({ kind: 'GRANT' }),
    effectivePermissions: jest.fn().mockResolvedValue({
      founder: false,
      grants: [
        {
          permission: PlatformPermission.EXERCISE_REPORT_REVIEW,
          scope: 'ORGANIZATION',
          targetOrganizationId: current.organizationId,
        },
      ],
    }),
  };
  const access: any = {
    governedReport: jest.fn(
      async (
        _id: string,
        currentActor: typeof actor,
        permission: PlatformPermission,
      ) => {
        await authority.requirePermission(
          currentActor,
          permission,
          current.organizationId,
        );
        return {
          id: current.id,
          organizationId: current.organizationId,
          projectId: current.projectId,
          buildingId: current.buildingId,
          authorization: 'PLATFORM_AUTHORITY',
        };
      },
    ),
  };
  return {
    service: new ExerciseReportGovernanceService(
      prisma,
      storage,
      authority,
      access,
    ),
    prisma,
    tx,
    storage,
    authority,
    access,
  };
}

describe('ExerciseReportGovernanceService', () => {
  it('requires the explicit review permission and appends audit in the transition transaction', async () => {
    const h = harness();
    await h.service.submitReview(report.id, dto, actor);
    expect(h.authority.requirePermission).toHaveBeenCalledWith(
      actor,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'org-1',
    );
    expect(h.tx.exerciseReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ExerciseReportStatus.IN_REVIEW,
          lockVersion: { increment: 1 },
        }),
      }),
    );
    expect(h.tx.exerciseReportAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: 'REVIEW_SUBMITTED',
          actorId: 'user-1',
          requestId: dto.requestId,
          eventHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
  });

  it('fails closed on stale lockVersion without writing', async () => {
    const h = harness({ ...report, lockVersion: 3 });
    await expect(
      h.service.submitReview(report.id, dto, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(h.tx.exerciseReport.update).not.toHaveBeenCalled();
    expect(h.tx.exerciseReportAuditEvent.create).not.toHaveBeenCalled();
  });

  it('enforces reviewer-approver separation', async () => {
    const h = harness({
      ...report,
      status: ExerciseReportStatus.IN_REVIEW,
      reviewedAt: new Date(),
      reviewedById: actor.userId,
    });
    await expect(
      h.service.approve(report.id, dto, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.authority.requirePermission).toHaveBeenCalledWith(
      actor,
      PlatformPermission.EXERCISE_REPORT_APPROVE,
      'org-1',
    );
  });

  it('denies portfolio aggregation without an explicit active Network assignment', async () => {
    const h = harness();
    await expect(
      h.service.portfolio({ limit: 100 }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.prisma.exerciseReport.findMany).toBeUndefined();
  });

  it('requires the additive operator Network assignment and matching Platform grant for portfolio aggregation', async () => {
    const h = harness();
    h.prisma.customerPortfolioAssignment.findMany.mockResolvedValue([
      {
        id: 'operator-network-assignment',
        organizationId: 'org-1',
        subjectType: 'OPERATOR_USER',
        operatorUserId: actor.userId,
        scope: 'PORTFOLIO',
        portfolioId: 'portfolio-1',
        regionId: null,
        buildingId: null,
      },
    ]);
    h.prisma.customerPortfolioBuildingMembership.findMany.mockResolvedValue([
      {
        buildingId: 'building-1',
        portfolioId: 'portfolio-1',
        regionId: 'region-1',
      },
    ]);
    h.prisma.exerciseReport.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'report-1', buildingId: 'building-1' }]);

    const result = await h.service.portfolio({ limit: 100 }, actor);

    expect(h.prisma.customerPortfolioAssignment.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        subjectType: 'OPERATOR_USER',
        operatorUserId: actor.userId,
        status: 'ACTIVE',
        permissions: { has: 'NETWORK_SUPERVISION_READ' },
      }),
    });
    expect(h.authority.requirePermission).toHaveBeenCalledWith(
      actor,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'org-1',
    );
    expect(result.reports).toHaveLength(1);
  });

  it('does not expose private storage keys in version metadata', async () => {
    const h = harness({
      ...report,
      versions: [
        {
          id: 'v1',
          versionNumber: 1,
          pdfStorageKey: 'private/key.pdf',
          documentSha256: 'a'.repeat(64),
        },
      ],
    });
    const versions = await h.service.versions(report.id, actor);
    expect(versions[0]).not.toHaveProperty('pdfStorageKey');
    expect(versions[0].documentSha256).toHaveLength(64);
  });

  it('publishes one immutable PDF version and records its digest in the audited transaction', async () => {
    const approved = {
      ...report,
      status: ExerciseReportStatus.APPROVED,
      approvedById: 'approver-1',
      activityLabel: 'Exercice synthétique P-4.3',
      buildingName: 'Bâtiment QA',
      buildingAddress: 'Montréal',
      type: 'EVACUATION',
      scenario: 'Scénario synthétique',
      conclusion: 'Conclusion gouvernée',
    };
    const h = harness(approved);
    h.prisma.exerciseReportTemplateVersion.findFirst.mockResolvedValue({
      id: 'template-1',
      code: 'CORO_STANDARD',
      version: 1,
      contentSha256: 'b'.repeat(64),
    });
    h.storage.uploadPrivateImmutable.mockResolvedValue({
      storageKey: 'stored',
    });
    h.tx.exerciseReport.findUniqueOrThrow
      .mockResolvedValueOnce(approved)
      .mockResolvedValueOnce({
        ...approved,
        status: ExerciseReportStatus.PUBLISHED,
        lockVersion: 3,
      });

    await h.service.publish(report.id, dto, actor);

    expect(h.authority.requirePermission).toHaveBeenCalledWith(
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
      'org-1',
    );
    expect(h.storage.uploadPrivateImmutable).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(
        /^exercise-reports\/org-1\/report-1\/v1\/[a-f0-9]{64}\.pdf$/,
      ),
      'application/pdf',
    );
    expect(h.tx.exerciseReportVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportId: report.id,
        versionNumber: 1,
        publishedById: actor.userId,
        documentSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        pdfStorageKey: expect.stringContaining('/v1/'),
        templateCode: 'CORO_STANDARD',
        templateVersion: 1,
      }),
    });
    expect(h.tx.exerciseReportAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operation: 'PUBLISHED' }),
      }),
    );
  });

  it('publishes an immutable tenant template version with explicit authority and audit', async () => {
    const h = harness();
    h.tx.exerciseReportTemplateVersion.findFirst.mockResolvedValue({
      id: 'template-old',
      version: 1,
    });
    h.tx.exerciseReportTemplateVersion.create.mockResolvedValue({
      id: 'template-new',
      organizationId: actor.organizationId,
      code: 'ORG_STANDARD',
      version: 2,
    });

    const result = await h.service.publishTemplate(
      {
        code: 'ORG_STANDARD',
        name: 'Modèle organisationnel',
        sections: ['IDENTIFICATION', 'FINDINGS'],
        requestId: '22222222-2222-4222-8222-222222222222',
        reason: 'Nouvelle version gouvernée',
      },
      actor,
    );

    expect(result.version).toBe(2);
    expect(h.authority.requirePermission).toHaveBeenCalledWith(
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
      actor.organizationId,
    );
    expect(h.tx.exerciseReportTemplateVersion.update).toHaveBeenCalledWith({
      where: { id: 'template-old' },
      data: { isActive: false },
    });
    expect(h.tx.exerciseReportTemplateAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: 'TEMPLATE_PUBLISHED',
          eventHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
  });

  it('rejects cross-tenant template publication when the exact grant is absent', async () => {
    const h = harness();
    h.authority.requirePermission.mockRejectedValueOnce(
      new ForbiddenException('Permission rapport exercice requise'),
    );
    await expect(
      h.service.publishTemplate(
        {
          code: 'ORG_STANDARD',
          name: 'Modèle organisationnel',
          sections: ['IDENTIFICATION'],
          requestId: '33333333-3333-4333-8333-333333333333',
          reason: 'Tentative hors tenant',
          organizationId: 'org-2',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.authority.requirePermission).toHaveBeenCalledWith(
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
      'org-2',
    );
    expect(h.tx.exerciseReportTemplateVersion.create).not.toHaveBeenCalled();
  });
});
