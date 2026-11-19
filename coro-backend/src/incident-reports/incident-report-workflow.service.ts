import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientOperationalPermission,
  CoroActorType,
  PlatformPermission,
  Prisma,
} from '@prisma/client';
import type { ProvenanceActor } from '../auth/coro-actor-provenance';
import {
  ensureProvenanceActor,
  provenanceActor,
  provenanceData,
} from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignClientIncidentReportReviewerDto,
  AssignIncidentReportReviewerDto,
  IncidentReportDecisionDto,
  PublishIncidentReportDto,
} from './dto/incident-report.dto';
import type { ClientUserAuthority } from '../auth/coro-authority';
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
    actor: ProvenanceActor,
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
      {
        userId: reviewer.id,
        organizationId,
        role: provenanceActor(actor).role,
      },
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_REVIEW,
      report.incidentEventId,
    );
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        await ensureProvenanceActor(tx, {
          userId: reviewer.id,
          organizationId,
          role: provenanceActor(actor).role,
        });
        const updated = await tx.incidentReport.updateMany({
          where: {
            id: reportId,
            organizationId,
            lockVersion: dto.expectedLockVersion,
            status: 'SUBMITTED',
          },
          data: {
            reviewerUserId: reviewer.id,
            reviewerActorType: CoroActorType.USER,
            reviewerActorId: reviewer.id,
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

  async eligibleClientReviewers(
    organizationId: string,
    buildingId: string,
    actor: ClientUserAuthority,
  ) {
    await this.access.require(
      actor,
      organizationId,
      buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
    );
    const now = new Date();
    return this.prisma.clientUser.findMany({
      where: {
        organizationId,
        clientId: actor.clientId,
        isActive: true,
        operationalPermissions: {
          has: ClientOperationalPermission.INCIDENT_REPORT_REVIEW,
        },
        operationalAssignments: {
          some: {
            organizationId,
            buildingId,
            status: 'ACTIVE',
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 100,
    });
  }

  async assignClientReviewer(
    organizationId: string,
    reportId: string,
    dto: AssignClientIncidentReportReviewerDto,
    actor: ClientUserAuthority,
  ) {
    const report = await this.report(organizationId, reportId);
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_REVIEW,
    );
    const now = new Date();
    const reviewer = await this.prisma.clientUser.findFirst({
      where: {
        id: dto.reviewerClientUserId,
        organizationId,
        clientId: actor.clientId,
        isActive: true,
      },
      select: {
        id: true,
        clientId: true,
        organizationId: true,
        role: true,
        sessionVersion: true,
        operationalPermissions: true,
        operationalAssignments: {
          where: {
            organizationId,
            buildingId: report.buildingId,
            status: 'ACTIVE',
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
          select: { buildingId: true },
        },
      },
    });
    if (!reviewer)
      throw new NotFoundException('Réviseur admissible introuvable.');
    const reviewerAuthority: ClientUserAuthority = {
      actorType: 'CLIENT_USER',
      actorId: reviewer.id,
      clientId: reviewer.clientId,
      organizationId: reviewer.organizationId,
      role: reviewer.role,
      sessionVersion: reviewer.sessionVersion,
      permissions: reviewer.operationalPermissions,
      buildingIds: reviewer.operationalAssignments.map(
        (assignment) => assignment.buildingId,
      ),
    };
    await this.access.require(
      reviewerAuthority,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_REVIEW,
      report.incidentEventId,
    );
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        await ensureProvenanceActor(tx, reviewerAuthority);
        const updated = await tx.incidentReport.updateMany({
          where: {
            id: reportId,
            organizationId,
            lockVersion: dto.expectedLockVersion,
            status: 'SUBMITTED',
          },
          data: {
            reviewerUserId: null,
            reviewerActorType: CoroActorType.CLIENT_USER,
            reviewerActorId: reviewer.id,
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
          'CLIENT_REVIEW_ASSIGNED',
          actor,
          dto.idempotencyKey,
          { reviewerActorType: 'CLIENT_USER', reviewerActorId: reviewer.id },
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
    actor: ProvenanceActor,
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
    const authority = provenanceActor(actor);
    if (
      report.reviewerActorType !== authority.actorType ||
      report.reviewerActorId !== authority.actorId
    )
      throw new NotFoundException('Rapport incident introuvable.');
    if (
      dto.decision === 'APPROVED' &&
      report.submittedByActorType === authority.actorType &&
      report.submittedByActorId === authority.actorId
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
        await ensureProvenanceActor(tx, actor);
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
              ? {
                  reviewerUserId: null,
                  reviewerActorType: null,
                  reviewerActorId: null,
                  reviewAssignedAt: null,
                }
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
            actorType: provenanceData(actor).actorType,
            actorId: provenanceData(actor).actorId,
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
    actor: ProvenanceActor,
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
        await ensureProvenanceActor(tx, actor);
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
            publishedByActorType: provenanceData(actor).actorType,
            publishedByActorId: provenanceData(actor).actorId,
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

  async queue(
    organizationId: string,
    buildingId: string,
    actor: ProvenanceActor,
  ) {
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
    actor: ProvenanceActor,
    idempotencyKey: string | null,
    metadata: Prisma.InputJsonValue,
  ) {
    return tx.incidentReportAuditEvent.create({
      data: {
        organizationId,
        reportId,
        action,
        actorType: provenanceData(actor).actorType,
        actorId: provenanceData(actor).actorId,
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
