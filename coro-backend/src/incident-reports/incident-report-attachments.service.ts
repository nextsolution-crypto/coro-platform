import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import type { ProvenanceActor } from '../auth/coro-actor-provenance';
import {
  ensureProvenanceActor,
  provenanceData,
} from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateIncidentReportAttachmentDto,
  RevokeIncidentReportAttachmentDto,
} from './dto/incident-report.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';
import {
  incidentReportAttachmentsEnabled,
  incidentReportClamavOnDemand,
  incidentReportsEnabled,
} from './incident-reports.config';
import { assertIncidentReportBinary } from './incident-report-binary-validator';

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
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    this.assertUploadsEnabled();
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
    assertIncidentReportBinary(bytes, dto.mediaType, dto.originalFileName);
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
    // À la demande : le fichier part en quarantaine et sera analysé dès que
    // ClamAV aura démarré ; sinon l'analyse reste immédiate et bloquante.
    const onDemand = incidentReportClamavOnDemand();
    if (!onDemand) {
      const scan = await this.scanner.scan(bytes);
      if (scan !== 'CLEAN')
        throw new BadRequestException('Fichier refusé par l’analyse antivirus.');
    }
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
      await ensureProvenanceActor(tx, actor);
      const provenance = provenanceData(actor);
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
          scanStatus: onDemand ? 'PENDING' : 'CLEAN',
          scannedAt: onDemand ? null : new Date(),
          provenance: {
            source: 'CORO_NATIVE',
            scanner: onDemand ? 'CLAMAV_ON_DEMAND' : 'CLAMAV_INSTREAM',
          },
          createdByActorType: provenance.actorType,
          createdByActorId: provenance.actorId,
        },
      });
      await tx.incidentReportAuditEvent.create({
        data: {
          organizationId,
          reportId,
          action: 'ATTACHMENT_ADDED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
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
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
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
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
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
    await this.prisma.$transaction(async (tx) => {
      await ensureProvenanceActor(tx, actor);
      const provenance = provenanceData(actor);
      await tx.incidentReportAttachment.update({
        where: { id: attachmentId },
        data: {
          revokedAt: new Date(),
          revokedByActorType: provenance.actorType,
          revokedByActorId: provenance.actorId,
          revocationReason: dto.reason,
        },
      });
      await tx.incidentReportAuditEvent.create({
        data: {
          organizationId,
          reportId,
          action: 'ATTACHMENT_REVOKED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
          reason: dto.reason,
          idempotencyKey: dto.idempotencyKey,
          metadata: { attachmentId },
        },
      });
    });
    return { revoked: true };
  }

  private assertEnabled() {
    if (!incidentReportsEnabled())
      throw new NotFoundException('Rapport incident introuvable.');
  }

  private assertUploadsEnabled() {
    if (!incidentReportAttachmentsEnabled())
      throw new ServiceUnavailableException(
        'Le téléversement de pièces jointes est indisponible tant que la protection antivirus n’est pas opérationnelle.',
      );
  }
}
