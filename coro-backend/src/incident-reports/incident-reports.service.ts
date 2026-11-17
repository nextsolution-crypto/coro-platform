import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CoroActorType,
  IncidentReportStatus,
  IncidentReportVersionStatus,
  PlatformPermission,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { incidentReportsEnabled } from './incident-reports.config';
import { IncidentReportAccessService } from './incident-report-access.service';
import { validateAndHashIncidentReportContent } from './incident-report-content';
import {
  CreateIncidentReportDto,
  CreateIncidentReportVersionDto,
  IncidentReportListQueryDto,
  SubmitIncidentReportDto,
  UpdateIncidentReportDraftDto,
} from './dto/incident-report.dto';

const reportSummarySelect = {
  id: true,
  buildingId: true,
  incidentEventId: true,
  reportNumber: true,
  reportType: true,
  title: true,
  status: true,
  currentVersionNumber: true,
  lockVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IncidentReportSelect;

@Injectable()
export class IncidentReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IncidentReportAccessService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateIncidentReportDto,
    actor: AdviserActor,
  ) {
    this.assertEnabled();
    await this.access.require(
      actor,
      organizationId,
      dto.buildingId,
      PlatformPermission.INCIDENT_REPORT_CREATE,
      dto.incidentEventId,
    );
    const existing = await this.prisma.incidentReport.findUnique({
      where: {
        organizationId_creationIdempotencyKey: {
          organizationId,
          creationIdempotencyKey: dto.idempotencyKey,
        },
      },
      select: reportSummarySelect,
    });
    if (existing) return existing;

    const creation = this.serializable(async (tx) => {
      const replay = await tx.incidentReport.findUnique({
        where: {
          organizationId_creationIdempotencyKey: {
            organizationId,
            creationIdempotencyKey: dto.idempotencyKey,
          },
        },
        select: reportSummarySelect,
      });
      if (replay) return replay;

      const [template, retention, incident] = await Promise.all([
        tx.incidentReportTemplateVersion.findFirst({
          where: {
            id: dto.templateVersionId,
            organizationId,
            reportType: dto.reportType,
            status: 'PUBLISHED',
          },
          select: { id: true, formSchema: true, contentHash: true },
        }),
        tx.incidentReportRetentionPolicy.findFirst({
          where: {
            id: dto.retentionPolicyId,
            organizationId,
            reportType: dto.reportType,
            isActive: true,
          },
          select: { id: true, retainForDays: true },
        }),
        dto.incidentEventId
          ? tx.incidentEvent.findFirst({
              where: {
                id: dto.incidentEventId,
                organizationId,
                buildingId: dto.buildingId,
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);
      if (!template || !retention || (dto.incidentEventId && !incident)) {
        throw new NotFoundException('Configuration de rapport introuvable.');
      }
      const content = validateAndHashIncidentReportContent(
        dto.content,
        template.formSchema,
      );
      const id = randomUUID();
      const reportNumber = `IR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${id.slice(0, 8).toUpperCase()}`;
      const retentionExpiresAt = new Date(
        Date.now() + retention.retainForDays * 86_400_000,
      );
      const report = await tx.incidentReport.create({
        data: {
          id,
          organizationId,
          buildingId: dto.buildingId,
          incidentEventId: dto.incidentEventId,
          templateVersionId: template.id,
          retentionPolicyId: retention.id,
          reportNumber,
          creationIdempotencyKey: dto.idempotencyKey,
          reportType: dto.reportType,
          title: dto.title.trim(),
          retentionExpiresAt,
          createdByActorType: CoroActorType.USER,
          createdByActorId: actor.userId,
          versions: {
            create: {
              templateVersionId: template.id,
              versionNumber: 1,
              content: content.normalized as Prisma.InputJsonValue,
              provenanceManifest: {
                origin: 'CORO_NATIVE',
                templateContentHash: template.contentHash,
              },
              contentHash: content.sha256,
              createdByActorType: CoroActorType.USER,
              createdByActorId: actor.userId,
            },
          },
          auditEvents: {
            create: {
              action: 'REPORT_CREATED',
              actorType: CoroActorType.USER,
              actorId: actor.userId,
              idempotencyKey: dto.idempotencyKey,
              metadata: { versionNumber: 1 },
            },
          },
        },
        select: reportSummarySelect,
      });
      return report;
    });

    try {
      return await creation;
    } catch (error) {
      const idempotencyCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';
      if (!idempotencyCollision) throw error;

      const replay = await this.prisma.incidentReport.findUnique({
        where: {
          organizationId_creationIdempotencyKey: {
            organizationId,
            creationIdempotencyKey: dto.idempotencyKey,
          },
        },
        select: reportSummarySelect,
      });
      if (replay) return replay;
      throw error;
    }
  }

  async list(
    organizationId: string,
    query: IncidentReportListQueryDto,
    actor: AdviserActor,
  ) {
    this.assertEnabled();
    if (!query.buildingId) {
      throw new BadRequestException('buildingId est requis.');
    }
    await this.access.require(
      actor,
      organizationId,
      query.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
    );
    const where: Prisma.IncidentReportWhereInput = {
      organizationId,
      buildingId: query.buildingId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.reportType ? { reportType: query.reportType } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { reportNumber: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = [
      { [query.sort]: query.order },
      { id: query.order },
    ] as Prisma.IncidentReportOrderByWithRelationInput[];
    const [total, items] = await this.prisma.$transaction([
      this.prisma.incidentReport.count({ where }),
      this.prisma.incidentReport.findMany({
        where,
        select: reportSummarySelect,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async get(organizationId: string, id: string, actor: AdviserActor) {
    this.assertEnabled();
    const report = await this.canonical(id, organizationId);
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
      report.incidentEventId,
    );
    return this.prisma.incidentReport.findUniqueOrThrow({
      where: { id },
      select: {
        ...reportSummarySelect,
        templateVersionId: true,
        retentionExpiresAt: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            status: true,
            content: true,
            contentHash: true,
            immutableAt: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async updateDraft(
    organizationId: string,
    id: string,
    dto: UpdateIncidentReportDraftDto,
    actor: AdviserActor,
  ) {
    return this.mutateDraft(
      organizationId,
      id,
      dto.expectedLockVersion,
      dto.idempotencyKey,
      actor,
      'DRAFT_UPDATED',
      async (tx, report, version, template) => {
        const content = validateAndHashIncidentReportContent(
          dto.content,
          template.formSchema,
        );
        await tx.incidentReportVersion.update({
          where: { id: version.id },
          data: {
            content: content.normalized as Prisma.InputJsonValue,
            contentHash: content.sha256,
          },
        });
        return tx.incidentReport.update({
          where: { id: report.id },
          data: {
            ...(dto.title ? { title: dto.title.trim() } : {}),
            lockVersion: { increment: 1 },
          },
          select: reportSummarySelect,
        });
      },
    );
  }

  async createVersion(
    organizationId: string,
    id: string,
    dto: CreateIncidentReportVersionDto,
    actor: AdviserActor,
  ) {
    this.assertEnabled();
    const canonical = await this.canonical(id, organizationId);
    await this.access.require(
      actor,
      organizationId,
      canonical.buildingId,
      PlatformPermission.INCIDENT_REPORT_EDIT,
      canonical.incidentEventId,
    );
    return this.serializable(async (tx) => {
      const replay = await this.idempotentResult(
        tx,
        organizationId,
        id,
        dto.idempotencyKey,
      );
      if (replay) return replay;
      const report = await this.lockReport(tx, id, organizationId);
      if (report.lockVersion !== dto.expectedLockVersion) this.conflict();
      if (report.status === IncidentReportStatus.ARCHIVED) this.conflict();
      const priorVersion = await tx.incidentReportVersion.findUniqueOrThrow({
        where: {
          reportId_versionNumber: {
            reportId: id,
            versionNumber: report.currentVersionNumber,
          },
        },
        select: { status: true },
      });
      if (
        report.status === IncidentReportStatus.DRAFT &&
        priorVersion.status !== IncidentReportVersionStatus.REJECTED
      ) {
        this.conflict();
      }
      const template = await tx.incidentReportTemplateVersion.findUniqueOrThrow(
        {
          where: { id: report.templateVersionId },
          select: { formSchema: true, contentHash: true },
        },
      );
      const content = validateAndHashIncidentReportContent(
        dto.content,
        template.formSchema,
      );
      const versionNumber = report.currentVersionNumber + 1;
      await tx.incidentReportVersion.create({
        data: {
          organizationId,
          reportId: id,
          templateVersionId: report.templateVersionId,
          versionNumber,
          content: content.normalized as Prisma.InputJsonValue,
          provenanceManifest: {
            origin: 'CORO_REVISION',
            priorVersionNumber: report.currentVersionNumber,
            templateContentHash: template.contentHash,
          },
          contentHash: content.sha256,
          createdByActorType: CoroActorType.USER,
          createdByActorId: actor.userId,
        },
      });
      const result = await tx.incidentReport.update({
        where: { id },
        data: {
          currentVersionNumber: versionNumber,
          status: IncidentReportStatus.DRAFT,
          lockVersion: { increment: 1 },
        },
        select: reportSummarySelect,
      });
      await this.audit(
        tx,
        organizationId,
        id,
        actor,
        'VERSION_CREATED',
        dto.idempotencyKey,
        {
          versionNumber,
          reason: dto.reason.trim(),
        },
      );
      return result;
    });
  }

  async submit(
    organizationId: string,
    id: string,
    dto: SubmitIncidentReportDto,
    actor: AdviserActor,
  ) {
    this.assertEnabled();
    const canonical = await this.canonical(id, organizationId);
    await this.access.require(
      actor,
      organizationId,
      canonical.buildingId,
      PlatformPermission.INCIDENT_REPORT_EDIT,
      canonical.incidentEventId,
    );
    return this.serializable(async (tx) => {
      const replay = await this.idempotentResult(
        tx,
        organizationId,
        id,
        dto.idempotencyKey,
      );
      if (replay) return replay;
      const report = await this.lockReport(tx, id, organizationId);
      if (
        report.lockVersion !== dto.expectedLockVersion ||
        report.status !== IncidentReportStatus.DRAFT
      ) {
        this.conflict();
      }
      const version = await tx.incidentReportVersion.findUniqueOrThrow({
        where: {
          reportId_versionNumber: {
            reportId: id,
            versionNumber: report.currentVersionNumber,
          },
        },
      });
      if (version.status !== IncidentReportVersionStatus.DRAFT) this.conflict();
      const now = new Date();
      await tx.incidentReportVersion.update({
        where: { id: version.id },
        data: {
          status: IncidentReportVersionStatus.SUBMITTED,
          immutableAt: now,
        },
      });
      const result = await tx.incidentReport.update({
        where: { id },
        data: {
          status: IncidentReportStatus.SUBMITTED,
          submittedByActorType: CoroActorType.USER,
          submittedByActorId: actor.userId,
          submittedAt: now,
          lockVersion: { increment: 1 },
        },
        select: reportSummarySelect,
      });
      await this.audit(
        tx,
        organizationId,
        id,
        actor,
        'REPORT_SUBMITTED',
        dto.idempotencyKey,
        {
          versionNumber: report.currentVersionNumber,
        },
      );
      return result;
    });
  }

  async versions(organizationId: string, id: string, actor: AdviserActor) {
    this.assertEnabled();
    const report = await this.canonical(id, organizationId);
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
      report.incidentEventId,
    );
    return this.prisma.incidentReportVersion.findMany({
      where: { organizationId, reportId: id },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        status: true,
        contentHash: true,
        immutableAt: true,
        createdByActorType: true,
        createdByActorId: true,
        createdAt: true,
      },
    });
  }

  private async mutateDraft(
    organizationId: string,
    id: string,
    expectedLockVersion: number,
    idempotencyKey: string,
    actor: AdviserActor,
    action: string,
    mutation: (
      tx: Prisma.TransactionClient,
      report: Awaited<ReturnType<IncidentReportsService['lockReport']>>,
      version: { id: string; status: IncidentReportVersionStatus },
      template: { formSchema: Prisma.JsonValue },
    ) => Promise<unknown>,
  ) {
    this.assertEnabled();
    const canonical = await this.canonical(id, organizationId);
    await this.access.require(
      actor,
      organizationId,
      canonical.buildingId,
      PlatformPermission.INCIDENT_REPORT_EDIT,
      canonical.incidentEventId,
    );
    return this.serializable(async (tx) => {
      const replay = await this.idempotentResult(
        tx,
        organizationId,
        id,
        idempotencyKey,
      );
      if (replay) return replay;
      const report = await this.lockReport(tx, id, organizationId);
      if (
        report.lockVersion !== expectedLockVersion ||
        report.status !== IncidentReportStatus.DRAFT
      ) {
        this.conflict();
      }
      const version = await tx.incidentReportVersion.findUniqueOrThrow({
        where: {
          reportId_versionNumber: {
            reportId: id,
            versionNumber: report.currentVersionNumber,
          },
        },
        select: { id: true, status: true },
      });
      if (version.status !== IncidentReportVersionStatus.DRAFT) this.conflict();
      const template = await tx.incidentReportTemplateVersion.findUniqueOrThrow(
        {
          where: { id: report.templateVersionId },
          select: { formSchema: true },
        },
      );
      const result = await mutation(tx, report, version, template);
      await this.audit(tx, organizationId, id, actor, action, idempotencyKey, {
        versionNumber: report.currentVersionNumber,
      });
      return result;
    });
  }

  private async canonical(id: string, organizationId: string) {
    const report = await this.prisma.incidentReport.findFirst({
      where: { id, organizationId },
      select: { id: true, buildingId: true, incidentEventId: true },
    });
    if (!report) throw new NotFoundException('Rapport incident introuvable.');
    return report;
  }

  private async lockReport(
    tx: Prisma.TransactionClient,
    id: string,
    organizationId: string,
  ) {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "IncidentReport"
      WHERE "id" = ${id} AND "organizationId" = ${organizationId}
      FOR UPDATE
    `);
    const report = await tx.incidentReport.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        buildingId: true,
        incidentEventId: true,
        templateVersionId: true,
        status: true,
        currentVersionNumber: true,
        lockVersion: true,
      },
    });
    if (!report) throw new NotFoundException('Rapport incident introuvable.');
    return report;
  }

  private async idempotentResult(
    tx: Prisma.TransactionClient,
    organizationId: string,
    reportId: string,
    idempotencyKey: string,
  ) {
    const event = await tx.incidentReportAuditEvent.findUnique({
      where: {
        organizationId_idempotencyKey: { organizationId, idempotencyKey },
      },
      select: { reportId: true },
    });
    if (!event) return null;
    if (event.reportId !== reportId) {
      throw new ConflictException('Clé d’idempotence déjà utilisée.');
    }
    return tx.incidentReport.findUniqueOrThrow({
      where: { id: reportId },
      select: reportSummarySelect,
    });
  }

  private audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    reportId: string,
    actor: AdviserActor,
    action: string,
    idempotencyKey: string,
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

  private async serializable<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 15_000,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!retryable || attempt === 3) throw error;
      }
    }
    throw new ConflictException(
      'La transaction concurrente doit être reprise.',
    );
  }

  private assertEnabled() {
    if (!incidentReportsEnabled()) {
      throw new NotFoundException('Rapports incident indisponibles.');
    }
  }

  private conflict(): never {
    throw new ConflictException(
      'Le rapport a été modifié. Rechargez la version courante.',
    );
  }
}
