import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoroActorType, PlatformPermission, Prisma } from '@prisma/client';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignIncidentReportReviewerDto,
  IncidentReportDecisionDto,
  PublishIncidentReportDto,
} from './dto/incident-report.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { incidentReportsEnabled } from './incident-reports.config';

@Injectable()
export class IncidentReportWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IncidentReportAccessService,
  ) {}

  async assign(
    organizationId: string,
    reportId: string,
    dto: AssignIncidentReportReviewerDto,
    actor: AdviserActor,
  ) {
    const report = await this.report(organizationId, reportId);
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_REVIEW,
    );
    const reviewer = await this.prisma.user.findFirst({
      where: { id: dto.reviewerUserId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!reviewer)
      throw new NotFoundException('Réviseur admissible introuvable.');
    await this.access.require(
      { ...actor, userId: reviewer.id, organizationId },
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_REVIEW,
      report.incidentEventId,
    );
    return this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.incidentReport.updateMany({
          where: {
            id: reportId,
            organizationId,
            lockVersion: dto.expectedLockVersion,
            status: 'SUBMITTED',
          },
          data: {
            reviewerUserId: reviewer.id,
            reviewAssignedAt: new Date(),
            status: 'IN_REVIEW',
            lockVersion: { increment: 1 },
          },
        });
        if (updated.count !== 1) this.conflict();
        await this.audit(
          tx,
          organizationId,
          reportId,
          'REVIEW_ASSIGNED',
          actor,
          dto.idempotencyKey,
          { reviewerUserId: reviewer.id },
        );
        return this.reportTx(tx, organizationId, reportId);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async decide(
    organizationId: string,
    reportId: string,
    dto: IncidentReportDecisionDto,
    actor: AdviserActor,
  ) {
    const report = await this.report(organizationId, reportId);
    const required =
      dto.decision === 'APPROVED'
        ? PlatformPermission.INCIDENT_REPORT_APPROVE
        : PlatformPermission.INCIDENT_REPORT_REVIEW;
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      required,
    );
    if (report.reviewerUserId !== actor.userId)
      throw new NotFoundException('Rapport incident introuvable.');
    if (
      dto.decision === 'APPROVED' &&
      report.submittedByActorId === actor.userId
    )
      throw new ConflictException(
        'Le créateur ne peut pas approuver sa propre version.',
      );
    const replay = await this.prisma.incidentReportApproval.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (replay) return replay;
    const target =
      dto.decision === 'APPROVED'
        ? 'APPROVED'
        : dto.decision === 'CORRECTION_REQUESTED' || dto.decision === 'REJECTED'
          ? 'DRAFT'
          : 'IN_REVIEW';
    return this.prisma.$transaction(
      async (tx) => {
        const version = await tx.incidentReportVersion.findFirst({
          where: {
            reportId,
            organizationId,
            versionNumber: report.currentVersionNumber,
            status: { in: ['SUBMITTED', 'REJECTED'] },
          },
          select: { id: true },
        });
        if (!version || !['SUBMITTED', 'IN_REVIEW'].includes(report.status))
          this.conflict();
        const update = await tx.incidentReport.updateMany({
          where: {
            id: reportId,
            organizationId,
            lockVersion: dto.expectedLockVersion,
            status: { in: ['SUBMITTED', 'IN_REVIEW'] },
          },
          data: {
            status: target,
            lockVersion: { increment: 1 },
            ...(target === 'DRAFT'
              ? { reviewerUserId: null, reviewAssignedAt: null }
              : {}),
          },
        });
        if (update.count !== 1) this.conflict();
        if (target === 'DRAFT')
          await tx.incidentReportVersion.update({
            where: { id: version.id },
            data: { status: 'REJECTED' },
          });
        if (target === 'APPROVED')
          await tx.incidentReportVersion.update({
            where: { id: version.id },
            data: { status: 'APPROVED', immutableAt: new Date() },
          });
        const decision = await tx.incidentReportApproval.create({
          data: {
            organizationId,
            reportId,
            reportVersionId: version.id,
            decision: dto.decision,
            comment: dto.comment?.trim(),
            actorType: CoroActorType.USER,
            actorId: actor.userId,
            actorRoleSnapshot: required,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        await this.audit(
          tx,
          organizationId,
          reportId,
          `REPORT_${dto.decision}`,
          actor,
          null,
          {
            approvalId: decision.id,
            versionNumber: report.currentVersionNumber,
          },
        );
        return decision;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async publish(
    organizationId: string,
    reportId: string,
    dto: PublishIncidentReportDto,
    actor: AdviserActor,
  ) {
    const report = await this.report(organizationId, reportId);
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_APPROVE,
    );
    const existing = await this.prisma.incidentReportAuditEvent.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing) return this.report(organizationId, reportId);
    return this.prisma.$transaction(
      async (tx) => {
        const update = await tx.incidentReport.updateMany({
          where: {
            id: reportId,
            organizationId,
            status: 'APPROVED',
            lockVersion: dto.expectedLockVersion,
          },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            lockVersion: { increment: 1 },
          },
        });
        if (update.count !== 1) this.conflict();
        await tx.incidentReportVersion.updateMany({
          where: {
            reportId,
            organizationId,
            versionNumber: report.currentVersionNumber,
            status: 'APPROVED',
          },
          data: { status: 'PUBLISHED' },
        });
        await this.audit(
          tx,
          organizationId,
          reportId,
          'REPORT_PUBLISHED',
          actor,
          dto.idempotencyKey,
          { versionNumber: report.currentVersionNumber },
        );
        return this.reportTx(tx, organizationId, reportId);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async queue(organizationId: string, buildingId: string, actor: AdviserActor) {
    if (!incidentReportsEnabled())
      throw new NotFoundException('Rapport incident introuvable.');
    await this.access.require(
      actor,
      organizationId,
      buildingId,
      PlatformPermission.INCIDENT_REPORT_REVIEW,
    );
    return this.prisma.incidentReport.findMany({
      where: {
        organizationId,
        buildingId,
        status: { in: ['SUBMITTED', 'IN_REVIEW', 'APPROVED'] },
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: 100,
      include: {
        versions: {
          where: { versionNumber: { gt: 0 } },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        approvals: { orderBy: { decidedAt: 'desc' }, take: 20 },
        attachments: {
          where: { revokedAt: null },
          select: {
            id: true,
            originalFileName: true,
            mediaType: true,
            scanStatus: true,
          },
        },
      },
    });
  }

  private async report(organizationId: string, id: string) {
    if (!incidentReportsEnabled())
      throw new NotFoundException('Rapport incident introuvable.');
    const report = await this.prisma.incidentReport.findFirst({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Rapport incident introuvable.');
    return report;
  }
  private reportTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    id: string,
  ) {
    return tx.incidentReport.findFirstOrThrow({
      where: { id, organizationId },
    });
  }
  private audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    reportId: string,
    action: string,
    actor: AdviserActor,
    idempotencyKey: string | null,
    metadata: Prisma.InputJsonValue,
  ) {
    return tx.incidentReportAuditEvent.create({
      data: {
        organizationId,
        reportId,
        action,
        actorType: CoroActorType.USER,
        actorId: actor.userId,
        idempotencyKey,
        metadata,
      },
    });
  }
  private conflict(): never {
    throw new ConflictException(
      'Le rapport a changé; actualisez avant de poursuivre.',
    );
  }
}
