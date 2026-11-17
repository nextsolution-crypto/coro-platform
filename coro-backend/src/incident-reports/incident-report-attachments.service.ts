import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoroActorType, PlatformPermission } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateIncidentReportAttachmentDto,
  RevokeIncidentReportAttachmentDto,
} from './dto/incident-report.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';
import { incidentReportsEnabled } from './incident-reports.config';

const MAX_BYTES = 10 * 1024 * 1024;
@Injectable()
export class IncidentReportAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scanner: IncidentReportAttachmentScanner,
    private readonly access: IncidentReportAccessService,
  ) {}

  async create(
    organizationId: string,
    reportId: string,
    dto: CreateIncidentReportAttachmentDto,
    actor: AdviserActor,
  ) {
    if (!incidentReportsEnabled())
      throw new NotFoundException('Rapport incident introuvable.');
    const report = await this.prisma.incidentReport.findFirst({
      where: { id: reportId, organizationId },
      select: { buildingId: true, status: true, currentVersionNumber: true },
    });
    if (!report) throw new NotFoundException('Rapport incident introuvable.');
    await this.access.require(
      actor,
      organizationId,
      report.buildingId,
      PlatformPermission.INCIDENT_REPORT_EDIT,
    );
    if (report.status !== 'DRAFT')
      throw new ConflictException(
        'Les pièces jointes ne peuvent être ajoutées qu’au brouillon.',
      );
    const bytes = Buffer.from(dto.fileBase64, 'base64');
    if (!bytes.length || bytes.length > MAX_BYTES)
      throw new BadRequestException('Fichier vide ou supérieur à 10 Mo.');
    const version = await this.prisma.incidentReportVersion.findFirst({
      where: {
        id: dto.reportVersionId,
        reportId,
        organizationId,
        versionNumber: report.currentVersionNumber,
        status: 'DRAFT',
      },
      select: { id: true },
    });
    if (!version)
      throw new ConflictException('Version de brouillon courante requise.');
    const scan = await this.scanner.scan(bytes);
    if (scan !== 'CLEAN')
      throw new BadRequestException('Fichier refusé par l’analyse antivirus.');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const existing = await this.prisma.incidentReportAttachment.findFirst({
      where: {
        organizationId,
        reportId,
        reportVersionId: version.id,
        sha256,
        revokedAt: null,
      },
    });
    if (existing) return existing;
    const id = randomUUID();
    const storageKey = `tenant-${organizationId}/incident-reports/${reportId}/${version.id}/${id}`;
    await this.storage.uploadPrivateImmutable(bytes, storageKey, dto.mediaType);
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.incidentReportAttachment.create({
        data: {
          id,
          organizationId,
          reportId,
          reportVersionId: version.id,
          originalFileName: dto.originalFileName.trim(),
          mediaType: dto.mediaType,
          sizeBytes: BigInt(bytes.length),
          sha256,
          storageKey,
          scanStatus: 'CLEAN',
          scannedAt: new Date(),
          provenance: { source: 'CORO_NATIVE', scanner: 'CLAMAV_INSTREAM' },
          createdByActorType: CoroActorType.USER,
          createdByActorId: actor.userId,
        },
      });
      await tx.incidentReportAuditEvent.create({
        data: {
          organizationId,
          reportId,
          action: 'ATTACHMENT_ADDED',
          actorType: CoroActorType.USER,
          actorId: actor.userId,
          idempotencyKey: dto.idempotencyKey,
          metadata: { attachmentId: id, sha256 },
        },
      });
      return {
        ...attachment,
        sizeBytes: Number(attachment.sizeBytes),
        storageKey: undefined,
      };
    });
  }

  async download(
    organizationId: string,
    reportId: string,
    attachmentId: string,
    actor: AdviserActor,
  ) {
    const row = await this.prisma.incidentReportAttachment.findFirst({
      where: {
        id: attachmentId,
        reportId,
        organizationId,
        revokedAt: null,
        scanStatus: 'CLEAN',
      },
      include: { report: { select: { buildingId: true } } },
    });
    if (!row) throw new NotFoundException('Pièce jointe introuvable.');
    await this.access.require(
      actor,
      organizationId,
      row.report.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
    );
    return {
      bytes: await this.storage.downloadPrivate(row.storageKey),
      mediaType: row.mediaType,
      fileName: row.originalFileName,
    };
  }

  async revoke(
    organizationId: string,
    reportId: string,
    attachmentId: string,
    dto: RevokeIncidentReportAttachmentDto,
    actor: AdviserActor,
  ) {
    const row = await this.prisma.incidentReportAttachment.findFirst({
      where: { id: attachmentId, reportId, organizationId },
      include: { report: { select: { buildingId: true } } },
    });
    if (!row) throw new NotFoundException('Pièce jointe introuvable.');
    await this.access.require(
      actor,
      organizationId,
      row.report.buildingId,
      PlatformPermission.INCIDENT_REPORT_EDIT,
    );
    if (row.revokedAt) return { revoked: true };
    await this.prisma.$transaction([
      this.prisma.incidentReportAttachment.update({
        where: { id: attachmentId },
        data: {
          revokedAt: new Date(),
          revokedByActorId: actor.userId,
          revocationReason: dto.reason,
        },
      }),
      this.prisma.incidentReportAuditEvent.create({
        data: {
          organizationId,
          reportId,
          action: 'ATTACHMENT_REVOKED',
          actorType: CoroActorType.USER,
          actorId: actor.userId,
          reason: dto.reason,
          idempotencyKey: dto.idempotencyKey,
          metadata: { attachmentId },
        },
      }),
    ]);
    return { revoked: true };
  }
}
