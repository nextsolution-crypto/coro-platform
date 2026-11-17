import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoroActorType, PlatformPermission, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateIncidentReportExportDto } from './dto/incident-report.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportFormSchema } from './incident-report-form-engine';
import {
  INCIDENT_REPORT_RENDERER_VERSION,
  IncidentReportPdfRenderer,
} from './incident-report-pdf.renderer';
import { incidentReportsEnabled } from './incident-reports.config';

@Injectable()
export class IncidentReportExportsService {
  private readonly renderer = new IncidentReportPdfRenderer();
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: IncidentReportAccessService,
  ) {}

  async create(
    organizationId: string,
    reportId: string,
    dto: CreateIncidentReportExportDto,
    actor: AdviserActor,
  ) {
    this.enabled();
    const report = await this.prisma.incidentReport.findFirst({
      where: { id: reportId, organizationId },
      include: {
        building: { select: { id: true, name: true } },
        templateVersion: { select: { formSchema: true, contentHash: true } },
        versions: { where: { id: dto.reportVersionId }, take: 1 },
        approvals: {
          where: { reportVersionId: dto.reportVersionId },
          orderBy: { decidedAt: 'asc' },
        },
      },
    });
    if (!report || !report.versions[0])
      throw new NotFoundException('Rapport incident introuvable.');
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_EXPORT,
      report.incidentEventId,
    );
    const version = report.versions[0];
    if (
      !version.immutableAt ||
      !['APPROVED', 'PUBLISHED'].includes(version.status)
    )
      throw new ConflictException(
        'Une version approuvee et figee est requise.',
      );
    const replay = await this.prisma.incidentReportExport.findUnique({
      where: {
        organizationId_requestIdempotencyKey: {
          organizationId,
          requestIdempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (replay) return this.publicRow(replay);
    const id = randomUUID();
    const generatedAt = new Date();
    const sourceManifest = {
      schemaVersion: 1,
      reportId,
      reportVersionId: version.id,
      reportVersionNumber: version.versionNumber,
      reportContentHash: version.contentHash,
      templateVersionId: report.templateVersionId,
      templateContentHash: report.templateVersion.contentHash,
      approvalIds: report.approvals.map((item) => item.id),
      generatedAt: generatedAt.toISOString(),
    };
    try {
      await this.prisma.incidentReportExport.create({
        data: {
          id,
          organizationId,
          reportId,
          reportVersionId: version.id,
          format: 'PDF',
          pageFormat: dto.pageFormat,
          locale: dto.locale,
          status: 'PROCESSING',
          rendererVersion: INCIDENT_REPORT_RENDERER_VERSION,
          requestIdempotencyKey: dto.idempotencyKey,
          sourceManifest,
          createdByActorType: CoroActorType.USER,
          createdByActorId: actor.userId,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const concurrentReplay =
        await this.prisma.incidentReportExport.findUnique({
          where: {
            organizationId_requestIdempotencyKey: {
              organizationId,
              requestIdempotencyKey: dto.idempotencyKey,
            },
          },
        });
      if (concurrentReplay) return this.publicRow(concurrentReplay);
      throw error;
    }
    try {
      const bytes = await this.renderer.render({
        locale: dto.locale,
        pageFormat: dto.pageFormat,
        reportNumber: report.reportNumber,
        title: report.title,
        versionNumber: version.versionNumber,
        reportId,
        reportVersionId: version.id,
        buildingName: report.building.name,
        contentHash: version.contentHash,
        content: version.content as Record<string, unknown>,
        schema: report.templateVersion
          .formSchema as unknown as IncidentReportFormSchema,
        approvals: report.approvals,
        generatedAt,
      });
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const storageKey = `tenant-${organizationId}/incident-report-exports/${reportId}/${version.id}/${id}.pdf`;
      await this.storage.uploadPrivateImmutable(
        bytes,
        storageKey,
        'application/pdf',
      );
      const completed = await this.prisma.$transaction(async (tx) => {
        const row = await tx.incidentReportExport.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            storageKey,
            sha256,
            completedAt: new Date(),
          },
        });
        await tx.incidentReportAuditEvent.create({
          data: {
            organizationId,
            reportId,
            action: 'EXPORT_COMPLETED',
            actorType: CoroActorType.USER,
            actorId: actor.userId,
            idempotencyKey: dto.idempotencyKey,
            metadata: {
              exportId: id,
              reportVersionId: version.id,
              sha256,
              rendererVersion: INCIDENT_REPORT_RENDERER_VERSION,
            },
          },
        });
        return row;
      });
      return this.publicRow(completed);
    } catch (error) {
      await this.prisma.incidentReportExport
        .update({
          where: { id },
          data: { status: 'FAILED', failureCode: 'EXPORT_GENERATION_FAILED' },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  async list(organizationId: string, reportId: string, actor: AdviserActor) {
    await this.authorizeRead(organizationId, reportId, actor);
    return this.prisma.incidentReportExport.findMany({
      where: { organizationId, reportId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        reportVersionId: true,
        format: true,
        pageFormat: true,
        locale: true,
        status: true,
        sha256: true,
        rendererVersion: true,
        sourceManifest: true,
        failureCode: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  async download(
    organizationId: string,
    reportId: string,
    exportId: string,
    actor: AdviserActor,
  ) {
    await this.authorizeRead(organizationId, reportId, actor);
    const row = await this.prisma.incidentReportExport.findFirst({
      where: { id: exportId, organizationId, reportId, status: 'COMPLETED' },
    });
    if (!row?.storageKey || !row.sha256)
      throw new NotFoundException('Export introuvable.');
    const bytes = await this.storage.downloadPrivate(row.storageKey);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== row.sha256)
      throw new ConflictException(
        "L'integrite de l'export ne peut pas etre confirmee.",
      );
    await this.prisma.incidentReportAuditEvent.create({
      data: {
        organizationId,
        reportId,
        action: 'EXPORT_DOWNLOADED',
        actorType: CoroActorType.USER,
        actorId: actor.userId,
        metadata: { exportId, sha256 },
      },
    });
    return { bytes, fileName: `CORO-${reportId}-${row.reportVersionId}.pdf` };
  }

  private async authorizeRead(
    organizationId: string,
    reportId: string,
    actor: AdviserActor,
  ) {
    this.enabled();
    const report = await this.prisma.incidentReport.findFirst({
      where: { id: reportId, organizationId },
      select: { buildingId: true, incidentEventId: true },
    });
    if (!report) throw new NotFoundException('Rapport incident introuvable.');
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
      report.incidentEventId,
    );
    return report;
  }
  private publicRow<T extends { storageKey: string | null }>(
    row: T,
  ): Omit<T, 'storageKey'> {
    const safe: Partial<T> = { ...row };
    delete safe.storageKey;
    return safe as Omit<T, 'storageKey'>;
  }
  private enabled() {
    if (!incidentReportsEnabled())
      throw new NotFoundException('Rapport incident introuvable.');
  }
}
