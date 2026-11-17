import { ConflictException, NotFoundException } from '@nestjs/common';
import { IncidentReportWorkflowService } from './incident-report-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { IncidentReportAccessService } from './incident-report-access.service';
import { AdviserActor } from '../auth/project-access';

describe('IncidentReportWorkflowService separation of duties', () => {
  const actor = { userId: 'approver', organizationId: 'org' } as AdviserActor;
  const access = { require: jest.fn() };
  const report = {
    id: 'report',
    organizationId: 'org',
    buildingId: 'building',
    status: 'IN_REVIEW',
    lockVersion: 2,
    currentVersionNumber: 1,
    reviewerUserId: 'approver',
    submittedByActorId: 'creator',
  };
  const transaction = jest.fn();
  const findApproval = jest.fn();
  const prisma = {
    incidentReport: { findFirst: jest.fn().mockResolvedValue(report) },
    incidentReportApproval: { findUnique: findApproval },
    $transaction: transaction,
  };
  const service = () =>
    new IncidentReportWorkflowService(
      prisma as unknown as PrismaService,
      access as unknown as IncidentReportAccessService,
    );
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    prisma.incidentReport.findFirst.mockResolvedValue(report);
    findApproval.mockResolvedValue(null);
    transaction.mockReset();
  });
  afterAll(() => {
    delete process.env.INCIDENT_REPORTS_ENABLED;
  });
  it('refuses creator self-approval before any transaction', async () => {
    prisma.incidentReport.findFirst.mockResolvedValue({
      ...report,
      submittedByActorId: 'approver',
    });
    await expect(
      service().decide(
        'org',
        'report',
        {
          decision: 'APPROVED',
          expectedLockVersion: 2,
          idempotencyKey: '00000000-0000-4000-8000-000000000001',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('hides a report assigned to another reviewer', async () => {
    prisma.incidentReport.findFirst.mockResolvedValue({
      ...report,
      reviewerUserId: 'other',
    });
    await expect(
      service().decide(
        'org',
        'report',
        {
          decision: 'REVIEWED',
          expectedLockVersion: 2,
          idempotencyKey: '00000000-0000-4000-8000-000000000002',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('refuses a decision until a reviewer is explicitly assigned', async () => {
    prisma.incidentReport.findFirst.mockResolvedValue({
      ...report,
      reviewerUserId: null,
    });
    await expect(
      service().decide(
        'org',
        'report',
        {
          decision: 'APPROVED',
          expectedLockVersion: 2,
          idempotencyKey: '00000000-0000-4000-8000-000000000004',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('requires the dedicated approval permission', async () => {
    transaction.mockRejectedValueOnce(new ConflictException());
    await expect(
      service().decide(
        'org',
        'report',
        {
          decision: 'APPROVED',
          expectedLockVersion: 2,
          idempotencyKey: '00000000-0000-4000-8000-000000000003',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(access.require).toHaveBeenCalledWith(
      actor,
      'org',
      'building',
      'INCIDENT_REPORT_APPROVE',
    );
  });
});
