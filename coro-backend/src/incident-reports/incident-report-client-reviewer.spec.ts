import { NotFoundException } from '@nestjs/common';
import { CoroActorType } from '@prisma/client';
import { IncidentReportWorkflowService } from './incident-report-workflow.service';

const organizationId = '00000000-0000-4000-8000-000000000001';
const buildingId = '00000000-0000-4000-8000-000000000002';
const reportId = '00000000-0000-4000-8000-000000000003';
const authority = {
  actorType: 'CLIENT_USER' as const,
  actorId: '00000000-0000-4000-8000-000000000004',
  clientId: '00000000-0000-4000-8000-000000000005',
  organizationId,
  role: 'CLIENT_MANAGER' as const,
  sessionVersion: 1,
  permissions: [],
  buildingIds: [buildingId],
};

describe('IncidentReportWorkflowService ClientUser reviewer', () => {
  const requireAccess = jest.fn().mockResolvedValue(undefined);
  const prisma: any = {
    incidentReport: {
      findFirst: jest.fn().mockResolvedValue({
        id: reportId,
        organizationId,
        buildingId,
        incidentEventId: null,
        status: 'SUBMITTED',
        lockVersion: 0,
      }),
    },
    clientUser: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const service = new IncidentReportWorkflowService(prisma, {
    require: requireAccess,
  } as never);

  beforeAll(() => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
  });
  afterAll(() => {
    delete process.env.INCIDENT_REPORTS_ENABLED;
  });
  beforeEach(() => jest.clearAllMocks());

  it('fails closed when the reviewer is not in the same canonical client scope', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);
    await expect(
      service.assignClientReviewer(
        organizationId,
        reportId,
        {
          reviewerClientUserId: '00000000-0000-4000-8000-000000000006',
          expectedLockVersion: 0,
          idempotencyKey: '00000000-0000-4000-8000-000000000007',
        },
        authority,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clientUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: authority.clientId }),
      }),
    );
    expect(prisma.$transaction).toBeUndefined();
  });

  it('persists a typed CLIENT_USER reviewer after server-side access checks', async () => {
    const reviewerId = '00000000-0000-4000-8000-000000000006';
    prisma.clientUser.findFirst.mockResolvedValue({
      id: reviewerId,
      clientId: authority.clientId,
      organizationId,
      role: 'CLIENT_CORPORATE',
      sessionVersion: 2,
      operationalPermissions: ['INCIDENT_REPORT_REVIEW'],
      operationalAssignments: [{ buildingId }],
    });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      coroActorIdentity: { upsert: jest.fn().mockResolvedValue({}) },
      incidentReport: {
        updateMany,
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: reportId }),
      },
      incidentReportAuditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn((callback: (value: typeof tx) => unknown) =>
      callback(tx),
    );

    await service.assignClientReviewer(
      organizationId,
      reportId,
      {
        reviewerClientUserId: reviewerId,
        expectedLockVersion: 0,
        idempotencyKey: '00000000-0000-4000-8000-000000000007',
      },
      authority,
    );

    expect(prisma.clientUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          operationalAssignments: expect.objectContaining({
            where: expect.objectContaining({
              organizationId,
              buildingId,
              status: 'ACTIVE',
              effectiveFrom: { lte: expect.any(Date) },
              OR: [
                { effectiveUntil: null },
                { effectiveUntil: { gt: expect.any(Date) } },
              ],
            }),
          }),
        }),
      }),
    );
    expect(requireAccess).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewerUserId: null,
          reviewerActorType: CoroActorType.CLIENT_USER,
          reviewerActorId: reviewerId,
        }),
      }),
    );
  });
});
