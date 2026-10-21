import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ExerciseReportStatus,
  PlatformPermission,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PlatformAuthorityService } from '../auth/platform-authority.service';
import { AdviserActor } from '../auth/project-access';
import {
  ExerciseReportTransitionDto,
  ExerciseReportPortfolioQueryDto,
  PublishExerciseReportTemplateDto,
} from './dto/exercise-report-transition.dto';
import {
  ExerciseReportRenderer,
  EXERCISE_REPORT_GENERATOR_VERSION,
} from './exercise-report.renderer';
import { ArchiveEntry, createTarGz } from './exercise-report-archive';
import { ExerciseReportAccessService } from './exercise-report-access.service';

const aggregateInclude = {
  participants: { orderBy: { order: 'asc' as const } },
  timelineEntries: { orderBy: { order: 'asc' as const } },
  findings: { orderBy: { order: 'asc' as const } },
  recommendations: { orderBy: { order: 'asc' as const } },
  actionItems: { orderBy: { order: 'asc' as const } },
  versions: { orderBy: { versionNumber: 'desc' as const } },
  auditEvents: {
    orderBy: [{ occurredAt: 'asc' as const }, { id: 'asc' as const }],
  },
};

@Injectable()
export class ExerciseReportGovernanceService {
  private readonly renderer = new ExerciseReportRenderer();
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private authority: PlatformAuthorityService,
    private access: ExerciseReportAccessService,
  ) {}

  private async accessible(
    id: string,
    actor: AdviserActor,
    permission: PlatformPermission,
  ) {
    const scope = await this.access.governedReport(id, actor, permission);
    const report = await this.prisma.exerciseReport.findFirst({
      where: {
        id,
        organizationId: scope.organizationId,
        projectId: scope.projectId,
      },
      include: aggregateInclude,
    });
    if (!report) throw new NotFoundException('Rapport exercice introuvable');
    return report;
  }

  private state(report: any) {
    return {
      status: report.status,
      lockVersion: report.lockVersion,
      versionCount: report.versions?.length ?? 0,
    };
  }
  private canonical(value: unknown) {
    return JSON.stringify(value, Object.keys(value as any).sort());
  }

  private async appendAudit(
    tx: any,
    report: any,
    actor: AdviserActor,
    dto: ExerciseReportTransitionDto,
    operation: string,
    before: unknown,
    after: unknown,
    authorization: string,
    metadata?: unknown,
  ) {
    const previous = await tx.exerciseReportAuditEvent.findFirst({
      where: { reportId: report.id },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      select: { eventHash: true },
    });
    const occurredAt = new Date();
    const payload = {
      reportId: report.id,
      operation,
      actorId: actor.userId,
      authorization,
      reason: dto.reason,
      requestId: dto.requestId,
      previousState: before,
      resultingState: after,
      metadata: metadata ?? null,
      occurredAt: occurredAt.toISOString(),
      previousEventHash: previous?.eventHash ?? null,
    };
    const eventHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    await tx.exerciseReportAuditEvent.create({
      data: {
        organizationId: report.organizationId,
        buildingId: report.buildingId,
        reportId: report.id,
        operation,
        actorId: actor.userId,
        authorization,
        reason: dto.reason,
        requestId: dto.requestId,
        previousState: before,
        resultingState: after,
        metadata: metadata ?? Prisma.JsonNull,
        occurredAt,
        previousEventHash: previous?.eventHash ?? null,
        eventHash,
      },
    });
  }

  private async transition(
    id: string,
    dto: ExerciseReportTransitionDto,
    actor: AdviserActor,
    expected: ExerciseReportStatus,
    next: ExerciseReportStatus,
    permission: PlatformPermission,
    operation: string,
    data: Record<string, unknown>,
  ) {
    const scope = await this.access.governedReport(id, actor, permission);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'exercise-report:' + id}))`;
        const report = await tx.exerciseReport.findFirst({
          where: {
            id,
            organizationId: scope.organizationId,
            projectId: scope.projectId,
          },
          include: aggregateInclude,
        });
        if (!report)
          throw new NotFoundException('Rapport exercice introuvable');
        if (
          report.status !== expected ||
          report.lockVersion !== dto.lockVersion
        )
          throw new ConflictException(
            'Etat ou lockVersion du rapport exercice obsolete',
          );
        const before = this.state(report);
        const after = {
          status: next,
          lockVersion: report.lockVersion + 1,
          versionCount: report.versions.length,
        };
        await tx.exerciseReport.update({
          where: { id },
          data: { ...data, status: next, lockVersion: { increment: 1 } },
        });
        await this.appendAudit(
          tx,
          report,
          actor,
          dto,
          operation,
          before,
          after,
          `${permission}:${scope.authorization}`,
        );
        return tx.exerciseReport.findUniqueOrThrow({
          where: { id },
          include: aggregateInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  submitReview(
    id: string,
    dto: ExerciseReportTransitionDto,
    actor: AdviserActor,
  ) {
    return this.transition(
      id,
      dto,
      actor,
      ExerciseReportStatus.DRAFT,
      ExerciseReportStatus.IN_REVIEW,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'REVIEW_SUBMITTED',
      {
        reviewSubmittedById: actor.userId,
        reviewSubmittedAt: new Date(),
        rejectionReason: null,
      },
    );
  }
  recordReview(
    id: string,
    dto: ExerciseReportTransitionDto,
    actor: AdviserActor,
  ) {
    return this.transition(
      id,
      dto,
      actor,
      ExerciseReportStatus.IN_REVIEW,
      ExerciseReportStatus.IN_REVIEW,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'REVIEW_ACCEPTED',
      { reviewedById: actor.userId, reviewedAt: new Date() },
    );
  }
  reject(id: string, dto: ExerciseReportTransitionDto, actor: AdviserActor) {
    return this.transition(
      id,
      dto,
      actor,
      ExerciseReportStatus.IN_REVIEW,
      ExerciseReportStatus.DRAFT,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'REVIEW_REJECTED',
      {
        rejectionReason: dto.reason,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
      },
    );
  }
  async approve(
    id: string,
    dto: ExerciseReportTransitionDto,
    actor: AdviserActor,
  ) {
    const report = await this.accessible(
      id,
      actor,
      PlatformPermission.EXERCISE_REPORT_APPROVE,
    );
    if (!report.reviewedAt)
      throw new ConflictException('Revue explicite requise avant approbation');
    if (report.reviewedById === actor.userId)
      throw new ForbiddenException('Separation revue-approbation requise');
    return this.transition(
      id,
      dto,
      actor,
      ExerciseReportStatus.IN_REVIEW,
      ExerciseReportStatus.APPROVED,
      PlatformPermission.EXERCISE_REPORT_APPROVE,
      'APPROVED',
      { approvedById: actor.userId, approvedAt: new Date() },
    );
  }

  private async template(actor: AdviserActor, organizationId: string) {
    const found = await this.prisma.exerciseReportTemplateVersion.findFirst({
      where: {
        code: 'CORO_STANDARD',
        isActive: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: [{ organizationId: 'desc' }, { version: 'desc' }],
    });
    if (found) return found;
    const sections = [
      'IDENTIFICATION',
      'PARTICIPANTS',
      'TIMELINE',
      'FINDINGS',
      'RECOMMENDATIONS',
      'ACTIONS',
      'CONCLUSION',
    ];
    return this.prisma.exerciseReportTemplateVersion.create({
      data: {
        organizationId: null,
        code: 'CORO_STANDARD',
        version: 1,
        name: 'Rapport exercice CORO standard',
        sections,
        contentSha256: createHash('sha256')
          .update(JSON.stringify(sections))
          .digest('hex'),
        createdById: actor.userId,
        publishedById: actor.userId,
        publicationReason: 'Amorçage du modèle CORO standard',
      },
    });
  }

  async templates(actor: AdviserActor) {
    const effective = await this.authority.effectivePermissions(actor);
    const templateGrants = effective.grants.filter(
      (grant: any) =>
        grant.permission === PlatformPermission.EXERCISE_REPORT_REVIEW ||
        grant.permission === PlatformPermission.EXERCISE_REPORT_PUBLISH,
    );
    const global =
      effective.founder ||
      templateGrants.some((grant: any) => grant.scope === 'GLOBAL');
    const organizationIds = templateGrants
      .map((grant: any) => grant.targetOrganizationId)
      .filter(Boolean);
    if (!global && !organizationIds.length)
      throw new ForbiddenException('Permission rapport exercice requise');
    return this.prisma.exerciseReportTemplateVersion.findMany({
      where: {
        isActive: true,
        ...(global
          ? {}
          : {
              OR: [
                { organizationId: { in: organizationIds } },
                { organizationId: null },
              ],
            }),
      },
      select: {
        id: true,
        organizationId: true,
        code: true,
        version: true,
        name: true,
        sections: true,
        contentSha256: true,
        createdById: true,
        createdAt: true,
        publishedById: true,
        publishedAt: true,
        publicationReason: true,
      },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async publishTemplate(
    dto: PublishExerciseReportTemplateDto,
    actor: AdviserActor,
  ) {
    const targetOrganizationId = dto.organizationId ?? actor.organizationId;
    await this.authority.requirePermission(
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
      targetOrganizationId,
    );
    const sections = dto.sections
      .map((section) => section.trim())
      .filter(Boolean);
    const contentSha256 = createHash('sha256')
      .update(JSON.stringify(sections))
      .digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'exercise-report-template:' + targetOrganizationId + ':' + dto.code}))`;
        const replay = await tx.exerciseReportTemplateAuditEvent.findFirst({
          where: { requestId: dto.requestId, operation: 'TEMPLATE_PUBLISHED' },
          include: { templateVersion: true },
        });
        if (replay) return replay.templateVersion;
        const previous = await tx.exerciseReportTemplateVersion.findFirst({
          where: { organizationId: targetOrganizationId, code: dto.code },
          orderBy: { version: 'desc' },
        });
        const version = (previous?.version ?? 0) + 1;
        if (previous) {
          await tx.exerciseReportTemplateVersion.update({
            where: { id: previous.id },
            data: { isActive: false },
          });
        }
        const published = await tx.exerciseReportTemplateVersion.create({
          data: {
            organizationId: targetOrganizationId,
            code: dto.code,
            version,
            name: dto.name.trim(),
            sections,
            contentSha256,
            createdById: actor.userId,
            publishedById: actor.userId,
            publicationReason: dto.reason,
          },
        });
        const previousAudit =
          await tx.exerciseReportTemplateAuditEvent.findFirst({
            where: { organizationId: targetOrganizationId },
            orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
            select: { eventHash: true },
          });
        const occurredAt = new Date();
        const metadata = {
          code: dto.code,
          version,
          contentSha256,
          supersedesVersionId: previous?.id ?? null,
        };
        const eventHash = createHash('sha256')
          .update(
            JSON.stringify({
              templateVersionId: published.id,
              actorId: actor.userId,
              operation: 'TEMPLATE_PUBLISHED',
              reason: dto.reason,
              requestId: dto.requestId,
              metadata,
              occurredAt: occurredAt.toISOString(),
              previousEventHash: previousAudit?.eventHash ?? null,
            }),
          )
          .digest('hex');
        await tx.exerciseReportTemplateAuditEvent.create({
          data: {
            organizationId: targetOrganizationId,
            templateVersionId: published.id,
            actorId: actor.userId,
            operation: 'TEMPLATE_PUBLISHED',
            reason: dto.reason,
            requestId: dto.requestId,
            metadata,
            occurredAt,
            previousEventHash: previousAudit?.eventHash ?? null,
            eventHash,
          },
        });
        return published;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async ensureImmutablePdf(
    pdf: Buffer,
    key: string,
    documentSha256: string,
  ) {
    try {
      const existing = await this.storage.downloadPrivate(key);
      const existingSha256 = createHash('sha256')
        .update(existing)
        .digest('hex');
      if (existingSha256 !== documentSha256 || existing.length !== pdf.length) {
        throw new ConflictException('Objet PDF immuable contradictoire');
      }
    } catch (error: unknown) {
      if (
        !(error instanceof Error) ||
        error.message !== 'PRIVATE_OBJECT_NOT_FOUND'
      ) {
        throw error;
      }
      await this.storage.uploadPrivateImmutable(pdf, key, 'application/pdf');
    }
  }

  async publish(
    id: string,
    dto: ExerciseReportTransitionDto,
    actor: AdviserActor,
  ) {
    const report = await this.accessible(
      id,
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
    );
    if (
      report.status !== ExerciseReportStatus.APPROVED ||
      report.lockVersion !== dto.lockVersion
    )
      throw new ConflictException(
        'Rapport non approuve ou lockVersion obsolete',
      );
    if (report.approvedById === actor.userId)
      throw new ForbiddenException(
        'Separation approbation-publication requise',
      );
    const template = await this.template(actor, report.organizationId);
    const versionNumber = (report.versions[0]?.versionNumber ?? 0) + 1;
    const pdf = await this.renderer.render(report, versionNumber, template);
    const documentSha256 = createHash('sha256').update(pdf).digest('hex');
    const key = `exercise-reports/${report.organizationId}/${report.id}/v${versionNumber}/${documentSha256}.pdf`;
    await this.ensureImmutablePdf(pdf, key, documentSha256);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'exercise-report:' + id}))`;
        const current = await tx.exerciseReport.findUniqueOrThrow({
          where: { id },
          include: aggregateInclude,
        });
        if (
          current.status !== ExerciseReportStatus.APPROVED ||
          current.lockVersion !== dto.lockVersion
        )
          throw new ConflictException('Publication concurrente refusee');
        const before = this.state(current);
        const snapshot = {
          ...current,
          versions: undefined,
          auditEvents: undefined,
          pdf: { documentSha256, generator: EXERCISE_REPORT_GENERATOR_VERSION },
          template: {
            code: template.code,
            version: template.version,
            contentSha256: template.contentSha256,
          },
        };
        await tx.exerciseReportVersion.create({
          data: {
            reportId: id,
            versionNumber,
            snapshot: snapshot as Prisma.InputJsonValue,
            createdById: actor.userId,
            publishedById: actor.userId,
            documentSha256,
            pdfStorageKey: key,
            pdfSize: pdf.length,
            templateCode: template.code,
            templateVersion: template.version,
          },
        });
        await tx.exerciseReport.update({
          where: { id },
          data: {
            status: ExerciseReportStatus.PUBLISHED,
            publishedById: actor.userId,
            publishedAt: new Date(),
            finalizedById: actor.userId,
            finalizedAt: new Date(),
            templateVersionId: template.id,
            lockVersion: { increment: 1 },
          },
        });
        await this.appendAudit(
          tx,
          current,
          actor,
          dto,
          'PUBLISHED',
          before,
          {
            status: ExerciseReportStatus.PUBLISHED,
            lockVersion: current.lockVersion + 1,
            versionCount: versionNumber,
          },
          PlatformPermission.EXERCISE_REPORT_PUBLISH,
          {
            versionNumber,
            documentSha256,
            templateCode: template.code,
            templateVersion: template.version,
          },
        );
        return tx.exerciseReport.findUniqueOrThrow({
          where: { id },
          include: aggregateInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async newRevision(
    id: string,
    dto: ExerciseReportTransitionDto,
    actor: AdviserActor,
  ) {
    return this.transition(
      id,
      dto,
      actor,
      ExerciseReportStatus.PUBLISHED,
      ExerciseReportStatus.DRAFT,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'REVISION_OPENED',
      {
        reviewSubmittedById: null,
        reviewSubmittedAt: null,
        reviewedById: null,
        reviewedAt: null,
        approvedById: null,
        approvedAt: null,
        publishedById: null,
        rejectionReason: dto.reason,
      },
    );
  }

  async versions(id: string, actor: AdviserActor) {
    const report = await this.accessible(
      id,
      actor,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
    );
    return report.versions.map(({ pdfStorageKey, ...safe }: any) => safe);
  }
  async download(id: string, versionNumber: number, actor: AdviserActor) {
    const report = await this.accessible(
      id,
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
    );
    const version = report.versions.find(
      (v: any) => v.versionNumber === versionNumber,
    );
    if (!version?.pdfStorageKey || !version.documentSha256)
      throw new NotFoundException('Version officielle introuvable');
    const bytes = await this.storage.downloadPrivate(version.pdfStorageKey);
    if (
      createHash('sha256').update(bytes).digest('hex') !==
      version.documentSha256
    )
      throw new ConflictException('Integrite PDF invalide');
    return {
      bytes,
      fileName: `rapport-exercice-${id}-v${versionNumber}.pdf`,
      sha256: version.documentSha256,
    };
  }

  async closure(id: string, actor: AdviserActor) {
    const report = await this.accessible(
      id,
      actor,
      PlatformPermission.EXERCISE_REPORT_PUBLISH,
    );
    if (!report.versions.length)
      throw new ConflictException('Publication requise');
    const actions = await this.prisma.correctiveAction.findMany({
      where: { organizationId: report.organizationId, exerciseReportId: id },
      include: {
        evidence: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            sha256: true,
            storageKey: true,
            originalFileName: true,
            mimeType: true,
            fileSize: true,
            externalUrl: true,
            systemReferenceType: true,
            systemReferenceId: true,
            noteText: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const official = report.versions[0];
    if (!official.pdfStorageKey || !official.documentSha256)
      throw new ConflictException('PDF officiel indisponible');
    const pdf = await this.storage.downloadPrivate(official.pdfStorageKey);
    if (
      createHash('sha256').update(pdf).digest('hex') !== official.documentSha256
    )
      throw new ConflictException('Intégrité du PDF officiel invalide');
    const sanitizedActions = actions.map((action: any) => ({
      ...action,
      evidence: action.evidence.map(
        ({ storageKey, ...evidence }: any) => evidence,
      ),
    }));
    const manifest = {
      schemaVersion: 'coro.exercise-closure/1',
      generatedAt: new Date().toISOString(),
      report: {
        id: report.id,
        organizationId: report.organizationId,
        buildingId: report.buildingId,
        activityId: report.activityId,
        status: report.status,
      },
      participants: report.participants,
      timeline: report.timelineEntries,
      findings: report.findings,
      recommendations: report.recommendations,
      actions: sanitizedActions,
      officialVersions: report.versions.map(
        ({ pdfStorageKey, ...safe }: any) => safe,
      ),
      audit: report.auditEvents,
    };
    const entries: ArchiveEntry[] = [
      {
        name: 'manifest.json',
        bytes: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
      },
      { name: `official/report-v${official.versionNumber}.pdf`, bytes: pdf },
    ];
    for (const action of actions as any[]) {
      for (const evidence of action.evidence) {
        if (!evidence.storageKey || !evidence.sha256) continue;
        const bytes = await this.storage.downloadPrivate(evidence.storageKey);
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        if (sha256 !== evidence.sha256)
          throw new ConflictException(
            `Intégrité de preuve invalide: ${evidence.id}`,
          );
        entries.push({
          name: `evidence/${action.id}/${evidence.id}-${evidence.originalFileName || 'evidence.bin'}`,
          bytes,
        });
      }
    }
    const bytes = createTarGz(entries);
    return {
      bytes,
      fileName: `cloture-exercice-${id}-v${official.versionNumber}.tar.gz`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }

  async portfolio(query: ExerciseReportPortfolioQueryDto, actor: AdviserActor) {
    const assignments = await this.prisma.customerPortfolioAssignment.findMany({
      where: {
        subjectType: 'OPERATOR_USER',
        operatorUserId: actor.userId,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }],
        permissions: { has: 'NETWORK_SUPERVISION_READ' },
        ...(query.portfolioId ? { portfolioId: query.portfolioId } : {}),
        ...(query.regionId ? { regionId: query.regionId } : {}),
      },
    });
    if (!assignments.length)
      throw new ForbiddenException('Affectation Network explicite requise');
    const organizationIds = [
      ...new Set(
        assignments.map((assignment: any) => assignment.organizationId),
      ),
    ];
    if (organizationIds.length !== 1)
      throw new ForbiddenException('Portée Network ambiguë');
    const organizationId = organizationIds[0];
    await this.authority.requirePermission(
      actor,
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      organizationId,
    );
    const memberships =
      await this.prisma.customerPortfolioBuildingMembership.findMany({
        where: {
          organizationId,
          OR: assignments.map((a: any) =>
            a.scope === 'BUILDING'
              ? { buildingId: a.buildingId! }
              : a.scope === 'REGION'
                ? { regionId: a.regionId! }
                : { portfolioId: a.portfolioId! },
          ),
        },
        select: { buildingId: true, portfolioId: true, regionId: true },
      });
    const reports = await this.prisma.exerciseReport.findMany({
      where: {
        organizationId,
        buildingId: {
          in: [...new Set(memberships.map((m: any) => m.buildingId))],
        },
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        buildingId: true,
        activityLabel: true,
        type: true,
        publishedAt: true,
        lockVersion: true,
        _count: {
          select: { findings: true, correctiveActions: true, versions: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: query.limit,
    });
    return {
      scope: {
        portfolioId: query.portfolioId ?? null,
        regionId: query.regionId ?? null,
      },
      memberships,
      reports,
    };
  }
}
