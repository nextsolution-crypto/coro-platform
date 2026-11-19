import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPermission, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import type { ProvenanceActor } from '../auth/coro-actor-provenance';
import {
  ensureProvenanceActor,
  provenanceData,
} from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  AnalyzeIncidentReportImportFileDto,
  CreateIncidentReportImportBatchDto,
  IncidentReportImportListQueryDto,
  StageIncidentReportImportFileDto,
} from './dto/incident-report-import.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';
import { incidentReportImportEnabled } from './incident-reports.config';

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const MAX_COLUMNS = 500;

@Injectable()
export class IncidentReportImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scanner: IncidentReportAttachmentScanner,
    private readonly access: IncidentReportAccessService,
  ) {}

  async createBatch(
    organizationId: string,
    dto: CreateIncidentReportImportBatchDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    await this.access.require(
      actor,
      organizationId,
      dto.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    const existing = await this.prisma.incidentReportImportBatch.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing) return existing;
    return this.prisma.$transaction(async (tx) => {
      const provenance = await ensureProvenanceActor(tx, actor);
      const batch = await tx.incidentReportImportBatch.create({
        data: {
          organizationId,
          buildingId: dto.buildingId,
          sourceSystem: dto.sourceSystem.trim().toUpperCase(),
          sourceSchemaVersion: dto.sourceSchemaVersion?.trim(),
          idempotencyKey: dto.idempotencyKey,
          createdByActorType: provenance.actorType,
          createdByActorId: provenance.actorId,
        },
      });
      await tx.incidentReportImportEvent.create({
        data: {
          organizationId,
          batchId: batch.id,
          action: 'BATCH_STAGED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
          idempotencyKey: `${dto.idempotencyKey}:event`,
          metadata: { sourceSystem: batch.sourceSystem },
        },
      });
      return batch;
    });
  }

  async list(
    organizationId: string,
    query: IncidentReportImportListQueryDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    await this.access.require(
      actor,
      organizationId,
      query.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    const [items, total] = await Promise.all([
      this.prisma.incidentReportImportBatch.findMany({
        where: { organizationId, buildingId: query.buildingId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { files: { select: this.publicFileSelection() } },
      }),
      this.prisma.incidentReportImportBatch.count({
        where: { organizationId, buildingId: query.buildingId },
      }),
    ]);
    return { items: this.serialize(items), total };
  }

  async stageFile(
    organizationId: string,
    batchId: string,
    dto: StageIncidentReportImportFileDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const batch = await this.batch(organizationId, batchId);
    await this.access.require(
      actor,
      organizationId,
      batch.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    if (!['STAGED', 'ANALYZED'].includes(batch.status))
      throw new ConflictException('Ce lot ne peut plus recevoir de fichier.');
    const priorRequest = await this.prisma.incidentReportImportEvent.findUnique(
      {
        where: {
          organizationId_idempotencyKey: {
            organizationId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        select: { id: true },
      },
    );
    if (priorRequest)
      throw new ConflictException('Cette demande de dépôt a déjà été traitée.');
    const bytes = this.decodeBase64(dto.fileBase64);
    if (!bytes.length || bytes.length > MAX_IMPORT_BYTES)
      throw new BadRequestException('Fichier vide ou supérieur à 20 Mo.');
    this.assertSignature(bytes, dto.mediaType);
    if ((await this.scanner.scan(bytes)) !== 'CLEAN')
      throw new BadRequestException('Fichier refusé par l’analyse antivirus.');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const duplicate = await this.prisma.incidentReportImportFile.findUnique({
      where: {
        organizationId_batchId_sha256: {
          organizationId,
          batchId,
          sha256,
        },
      },
      select: this.publicFileSelection(),
    });
    if (duplicate) return this.serialize(duplicate);
    const id = randomUUID();
    const storageKey = `tenant-${organizationId}/incident-report-imports/${batchId}/${id}`;
    await this.storage.uploadPrivateImmutable(bytes, storageKey, dto.mediaType);
    const provenance = provenanceData(actor);
    const file = await this.prisma.$transaction(async (tx) => {
      await ensureProvenanceActor(tx, actor);
      const created = await tx.incidentReportImportFile.create({
        data: {
          id,
          organizationId,
          batchId,
          originalFileName: dto.originalFileName.trim(),
          mediaType: dto.mediaType,
          sizeBytes: BigInt(bytes.length),
          sha256,
          storageKey,
          scanStatus: 'CLEAN',
        },
        select: this.publicFileSelection(),
      });
      await tx.incidentReportImportEvent.create({
        data: {
          organizationId,
          batchId,
          action: 'FILE_STAGED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
          idempotencyKey: dto.idempotencyKey,
          metadata: { fileId: id, sha256, sizeBytes: bytes.length },
        },
      });
      return created;
    });
    return this.serialize(file);
  }

  async analyze(
    organizationId: string,
    batchId: string,
    fileId: string,
    dto: AnalyzeIncidentReportImportFileDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const batch = await this.batch(organizationId, batchId);
    await this.access.require(
      actor,
      organizationId,
      batch.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    const file = await this.prisma.incidentReportImportFile.findFirst({
      where: { id: fileId, batchId, organizationId, scanStatus: 'CLEAN' },
    });
    if (!file) throw new NotFoundException('Fichier d’import introuvable.');
    if (file.status === 'ANALYZED') return this.serialize(file);
    const bytes = await this.storage.downloadPrivate(file.storageKey);
    if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
      throw new ConflictException('Intégrité du fichier d’import invalide.');
    const analysis = this.analyzeBytes(bytes, file.mediaType);
    if (analysis.recordCount > dto.expectedMaximumRecords)
      throw new BadRequestException(
        'Le fichier dépasse la limite de lignes autorisée.',
      );
    const provenance = provenanceData(actor);
    const updated = await this.prisma.$transaction(async (tx) => {
      await ensureProvenanceActor(tx, actor);
      const result = await tx.incidentReportImportFile.update({
        where: { id: fileId },
        data: {
          status: 'ANALYZED',
          detectedEncoding: 'UTF-8',
          headers: analysis.headers,
          recordCount: analysis.recordCount,
          analysis: {
            parserVersion: 'CORO_IMPORT_STAGING_1',
            emptyRows: analysis.emptyRows,
          },
          analyzedAt: new Date(),
        },
        select: this.publicFileSelection(),
      });
      await tx.incidentReportImportEvent.create({
        data: {
          organizationId,
          batchId,
          action: 'FILE_ANALYZED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
          idempotencyKey: dto.idempotencyKey,
          metadata: { fileId, recordCount: analysis.recordCount },
        },
      });
      await tx.incidentReportImportBatch.update({
        where: { id: batchId },
        data: { status: 'ANALYZED', lockVersion: { increment: 1 } },
      });
      return result;
    });
    return this.serialize(updated);
  }

  private async batch(organizationId: string, id: string) {
    const batch = await this.prisma.incidentReportImportBatch.findFirst({
      where: { id, organizationId },
    });
    if (!batch) throw new NotFoundException('Lot d’import introuvable.');
    return batch;
  }

  private analyzeBytes(bytes: Buffer, mediaType: string) {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new BadRequestException('Le fichier doit être encodé en UTF-8.');
    }
    if (mediaType === 'application/json') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new BadRequestException('JSON invalide.');
      }
      if (!Array.isArray(parsed))
        throw new BadRequestException('Le JSON doit contenir un tableau.');
      const records = parsed as unknown[];
      if (
        records.some(
          (record) =>
            !record || typeof record !== 'object' || Array.isArray(record),
        )
      )
        throw new BadRequestException('Chaque entrée JSON doit être un objet.');
      const headers = [
        ...new Set(records.flatMap((record) => Object.keys(record as object))),
      ];
      this.assertHeaders(headers);
      return { headers, recordCount: records.length, emptyRows: 0 };
    }
    const rows = this.csvRows(text);
    if (!rows.length) throw new BadRequestException('Le CSV est vide.');
    const headers = rows[0].map((value) => value.trim());
    this.assertHeaders(headers);
    const body = rows.slice(1);
    return {
      headers,
      recordCount: body.length,
      emptyRows: body.filter((row) => row.every((value) => !value.trim()))
        .length,
    };
  }

  private csvRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"') {
        if (quoted && text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[index + 1] === '\n') index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else cell += char;
      if (rows.length > 100_001)
        throw new BadRequestException('Le CSV dépasse 100 000 lignes.');
    }
    if (quoted) throw new BadRequestException('Guillemet CSV non terminé.');
    if (cell.length || row.length) rows.push([...row, cell]);
    return rows;
  }

  private assertHeaders(headers: string[]) {
    if (!headers.length || headers.length > MAX_COLUMNS)
      throw new BadRequestException('Nombre de colonnes invalide.');
    if (headers.some((header) => !header || header.length > 128))
      throw new BadRequestException('En-tête vide ou trop long.');
    if (new Set(headers).size !== headers.length)
      throw new BadRequestException('Les en-têtes doivent être uniques.');
  }

  private assertSignature(bytes: Buffer, mediaType: string) {
    const prefix = bytes.subarray(0, 64).toString('utf8').trimStart();
    if (bytes.includes(0))
      throw new BadRequestException('Fichier binaire refusé.');
    if (mediaType === 'application/json' && !prefix.startsWith('['))
      throw new BadRequestException('Signature JSON invalide.');
  }

  private decodeBase64(value: string): Buffer {
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        value,
      )
    )
      throw new BadRequestException('Encodage base64 invalide.');
    return Buffer.from(value, 'base64');
  }

  private publicFileSelection() {
    return {
      id: true,
      originalFileName: true,
      mediaType: true,
      sizeBytes: true,
      sha256: true,
      scanStatus: true,
      status: true,
      detectedEncoding: true,
      headers: true,
      recordCount: true,
      analysis: true,
      createdAt: true,
      analyzedAt: true,
    } satisfies Prisma.IncidentReportImportFileSelect;
  }

  private serialize<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_, item) =>
        typeof item === 'bigint' ? Number(item) : item,
      ),
    ) as T;
  }

  private assertEnabled() {
    if (!incidentReportImportEnabled())
      throw new NotFoundException('Import de rapports introuvable.');
  }
}
