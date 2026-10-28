import { ForbiddenException } from '@nestjs/common';
import { ApprovalService } from '../../coro-backend/src/approval/approval.service';

jest.mock('../../coro-backend/src/export/export.service', () => ({
  ExportService: class ExportService {},
}));

const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };
const operator = {
  userId: 'operator-a',
  organizationId: 'org-a',
  role: 'OPERATOR',
};

function service(prisma: any) {
  return new ApprovalService(
    prisma,
    {
      create: jest.fn().mockResolvedValue({}),
      createForOrganization: jest.fn().mockResolvedValue({}),
    } as any,
    { sendDocumentAvailable: jest.fn().mockResolvedValue({}) } as any,
    { generatePdf: jest.fn(() => new Promise(() => undefined)) } as any,
    { uploadFile: jest.fn() } as any,
  );
}

describe('Organization document review characterization audit', () => {
  it('REVIEW-001: reports approval eligibility to an OPERATOR although the decision endpoint rejects that role', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-a',
          status: 'REVIEW',
          submittedById: 'another-user',
        }),
      },
      projectVersion: { create: jest.fn() },
    };
    const approval = service(prisma);

    await expect(
      approval.canApprove('project-a', operator.userId, operator.organizationId),
    ).resolves.toBe(true);
    await expect(
      approval.approve(
        'project-a',
        operator.userId,
        operator.organizationId,
        operator.role,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.projectVersion.create).not.toHaveBeenCalled();
  });

  it('REVIEW-002: allows an archived project to be submitted because the mutable project predicate is not applied', async () => {
    const project = {
      id: 'project-a',
      status: 'ARCHIVED',
      submittedById: null,
      client: { name: 'Synthetic client' },
      building: { name: 'Synthetic building' },
      user: {},
    };
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue(project),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue({}) },
    };

    await expect(service(prisma).submit('project-a', operator)).resolves.toMatchObject({
      status: 'REVIEW',
    });
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REVIEW' }),
      }),
    );
  });

  it('REVIEW-003: observation creation does not consult project authority or lifecycle', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn() },
      reviewObservation: {
        create: jest.fn().mockResolvedValue({ id: 'observation-a' }),
      },
    };

    await expect(
      service(prisma).addObservation(
        'unassigned-project',
        operator.userId,
        operator.organizationId,
        { texte: 'Synthetic observation' },
      ),
    ).resolves.toEqual({ id: 'observation-a' });
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
    expect(prisma.reviewObservation.create).toHaveBeenCalledTimes(1);
  });

  it('REVIEW-004: archived projects are reported editable by the approval helper', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-a',
          status: 'ARCHIVED',
          submittedById: null,
        }),
      },
    };
    await expect(
      service(prisma).canEdit('project-a', operator.userId, operator.organizationId),
    ).resolves.toBe(true);
  });

  it('REVIEW-005: leaves a created approval version when the following project transition fails', async () => {
    const project = {
      id: 'project-a',
      status: 'REVIEW',
      submittedById: 'submitter-a',
      documentType: 'PMU',
      client: { name: 'Synthetic client' },
      building: { name: 'Synthetic building' },
    };
    const prisma: any = {
      $transaction: jest.fn(),
      project: {
        findFirst: jest.fn().mockResolvedValue(project),
        update: jest.fn().mockRejectedValue(new Error('injected transition failure')),
      },
      projectVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'version-a' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: 'A', lastName: 'Reviewer' }),
      },
    };

    await expect(
      service(prisma).approve('project-a', admin.userId, admin.organizationId, admin.role),
    ).rejects.toThrow('injected transition failure');
    expect(prisma.projectVersion.create).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('REVIEW-006: approval snapshot contains decision metadata but no immutable document identity or hash', async () => {
    const project = {
      id: 'project-a',
      status: 'REVIEW',
      submittedById: 'submitter-a',
      documentType: 'PSI',
      client: { name: 'Synthetic client' },
      building: { name: 'Synthetic building' },
    };
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue(project),
        update: jest.fn().mockResolvedValue({}),
      },
      projectVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: 'A', lastName: 'Reviewer' }),
      },
      clientUser: { findMany: jest.fn().mockResolvedValue([]) },
    };

    await service(prisma).approve('project-a', admin.userId, admin.organizationId, admin.role);
    const snapshot = prisma.projectVersion.create.mock.calls[0][0].data.snapshot;
    expect(snapshot).toMatchObject({ type: 'APPROVAL', approvedById: admin.userId });
    expect(snapshot.documentId).toBeUndefined();
    expect(snapshot.documentVersion).toBeUndefined();
    expect(snapshot.documentHash).toBeUndefined();
    expect(snapshot.lockVersion).toBeUndefined();
  });

  it('REVIEW-007: accepts a return for revision without a reason', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-a',
          status: 'REVIEW',
          submittedById: 'submitter-a',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue({}) },
    };

    await expect(
      service(prisma).requestRevision('project-a', admin),
    ).resolves.toMatchObject({ status: 'IN_PROGRESS' });
    expect(prisma.project.update).toHaveBeenCalledTimes(1);
  });
});
