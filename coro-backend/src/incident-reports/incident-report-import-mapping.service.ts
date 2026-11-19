import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPermission, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { ProvenanceActor } from '../auth/coro-actor-provenance';
import {
  ensureProvenanceActor,
  provenanceData,
} from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfigureIncidentReportImportMappingDto,
  IncidentReportImportMappingRuleDto,
  PreviewIncidentReportImportDto,
} from './dto/incident-report-import-mapping.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportImportService } from './incident-report-import.service';
import { incidentReportImportEnabled } from './incident-reports.config';

type Conflict = {
  row: number | null;
  sourceHeader: string;
  canonicalField: string;
  code: string;
};

@Injectable()
export class IncidentReportImportMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imports: IncidentReportImportService,
    private readonly access: IncidentReportAccessService,
  ) {}

  async configure(
    organizationId: string,
    batchId: string,
    dto: ConfigureIncidentReportImportMappingDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const batch = await this.requireBatch(organizationId, batchId, actor);
    if (!['ANALYZED', 'MAPPING', 'READY'].includes(batch.status))
      throw new ConflictException('Le lot doit être analysé avant le mapping.');
    this.assertRules(dto.rules);
    const rules = dto.rules
      .map((rule) => ({ ...rule }))
      .sort((left, right) =>
        left.canonicalField.localeCompare(right.canonicalField),
      );
    const rulesHash = this.hash(rules);
    const existing = await this.prisma.incidentReportImportMapping.findFirst({
      where: { organizationId, batchId, rulesHash },
    });
    if (existing) return existing;
    const provenance = provenanceData(actor);
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        const latest = await tx.incidentReportImportMapping.findFirst({
          where: { organizationId, batchId },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        await tx.incidentReportImportMapping.updateMany({
          where: { organizationId, batchId, isActive: true },
          data: { isActive: false },
        });
        const mapping = await tx.incidentReportImportMapping.create({
          data: {
            organizationId,
            batchId,
            version: (latest?.version ?? 0) + 1,
            rules: rules as unknown as Prisma.InputJsonValue,
            rulesHash,
            createdByActorType: provenance.actorType,
            createdByActorId: provenance.actorId,
          },
        });
        await tx.incidentReportImportBatch.update({
          where: { id: batchId },
          data: { status: 'MAPPING', lockVersion: { increment: 1 } },
        });
        await tx.incidentReportImportEvent.create({
          data: {
            organizationId,
            batchId,
            action: 'MAPPING_CONFIGURED',
            actorType: provenance.actorType,
            actorId: provenance.actorId,
            idempotencyKey: dto.idempotencyKey,
            metadata: {
              mappingId: mapping.id,
              version: mapping.version,
              rulesHash,
            },
          },
        });
        return mapping;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async preview(
    organizationId: string,
    batchId: string,
    dto: PreviewIncidentReportImportDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    await this.requireBatch(organizationId, batchId, actor);
    const mapping = await this.prisma.incidentReportImportMapping.findFirst({
      where: { id: dto.mappingId, batchId, organizationId, isActive: true },
    });
    if (!mapping) throw new NotFoundException('Mapping actif introuvable.');
    const source = await this.imports.loadPreviewRecords(
      organizationId,
      batchId,
      dto.fileId,
      dto.maximumPreviewRows,
    );
    const existing = await this.prisma.incidentReportImportPreview.findUnique({
      where: {
        organizationId_batchId_fileId_mappingHash_sourceFileHash: {
          organizationId,
          batchId,
          fileId: dto.fileId,
          mappingHash: mapping.rulesHash,
          sourceFileHash: source.sourceFileHash,
        },
      },
    });
    const rules =
      mapping.rules as unknown as IncidentReportImportMappingRuleDto[];
    const result = this.mapRecords(source.headers, source.records, rules);
    if (existing)
      return { preview: existing, samples: result.samples, reused: true };
    const provenance = provenanceData(actor);
    const preview = await this.prisma.$transaction(async (tx) => {
      await ensureProvenanceActor(tx, actor);
      const created = await tx.incidentReportImportPreview.create({
        data: {
          organizationId,
          batchId,
          fileId: dto.fileId,
          mappingId: mapping.id,
          sourceFileHash: source.sourceFileHash,
          mappingHash: mapping.rulesHash,
          summary: {
            totalRecords: source.totalRecords,
            previewedRecords: source.records.length,
            validPreviewRecords: result.validRecords,
            conflictCount: result.conflicts.length,
          },
          conflicts: result.conflicts as unknown as Prisma.InputJsonValue,
          createdByActorType: provenance.actorType,
          createdByActorId: provenance.actorId,
        },
      });
      await tx.incidentReportImportBatch.update({
        where: { id: batchId },
        data: {
          status: result.conflicts.length ? 'MAPPING' : 'READY',
          lockVersion: { increment: 1 },
        },
      });
      await tx.incidentReportImportEvent.create({
        data: {
          organizationId,
          batchId,
          action: 'MAPPING_PREVIEWED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
          idempotencyKey: dto.idempotencyKey,
          metadata: {
            previewId: created.id,
            conflictCount: result.conflicts.length,
          },
        },
      });
      return created;
    });
    return { preview, samples: result.samples, reused: false };
  }

  mapRecords(
    headers: string[],
    records: Record<string, unknown>[],
    rules: IncidentReportImportMappingRuleDto[],
  ) {
    const conflicts: Conflict[] = [];
    for (const rule of rules) {
      if (!headers.includes(rule.sourceHeader))
        conflicts.push({
          row: null,
          sourceHeader: rule.sourceHeader,
          canonicalField: rule.canonicalField,
          code: 'SOURCE_HEADER_MISSING',
        });
    }
    let validRecords = 0;
    const samples = records.map((record, index) => {
      const mapped: Record<string, unknown> = {};
      let valid = true;
      for (const rule of rules) {
        const raw = record[rule.sourceHeader];
        if (
          rule.required &&
          (raw === null || raw === undefined || raw === '')
        ) {
          valid = false;
          conflicts.push({
            row: index + 1,
            sourceHeader: rule.sourceHeader,
            canonicalField: rule.canonicalField,
            code: 'REQUIRED_VALUE_MISSING',
          });
          continue;
        }
        try {
          mapped[rule.canonicalField] = this.transform(raw, rule.transform);
        } catch {
          valid = false;
          conflicts.push({
            row: index + 1,
            sourceHeader: rule.sourceHeader,
            canonicalField: rule.canonicalField,
            code: 'TRANSFORM_FAILED',
          });
        }
      }
      if (valid) validRecords += 1;
      return { row: index + 1, valid, mapped };
    });
    return { conflicts, validRecords, samples };
  }

  private transform(value: unknown, transform: string): unknown {
    if (value === null || value === undefined || value === '') return value;
    if (transform === 'NONE') return value;
    if (transform === 'TRIM') return String(value).trim();
    if (transform === 'UPPERCASE') return String(value).trim().toUpperCase();
    if (transform === 'NUMBER') {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error('invalid number');
      return number;
    }
    if (transform === 'DATE_ISO') {
      const date = new Date(String(value));
      if (Number.isNaN(date.valueOf())) throw new Error('invalid date');
      return date.toISOString();
    }
    throw new Error('unsupported transform');
  }

  private assertRules(rules: IncidentReportImportMappingRuleDto[]) {
    const source = rules.map((rule) => rule.sourceHeader);
    const targets = rules.map((rule) => rule.canonicalField);
    if (new Set(source).size !== source.length)
      throw new BadRequestException(
        'Une colonne source ne peut être mappée deux fois.',
      );
    if (new Set(targets).size !== targets.length)
      throw new BadRequestException(
        'Un champ canonique ne peut être mappé deux fois.',
      );
  }

  private async requireBatch(
    organizationId: string,
    batchId: string,
    actor: ProvenanceActor,
  ) {
    const batch = await this.prisma.incidentReportImportBatch.findFirst({
      where: { id: batchId, organizationId },
    });
    if (!batch) throw new NotFoundException('Lot d’import introuvable.');
    await this.access.require(
      actor,
      organizationId,
      batch.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    return batch;
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private assertEnabled() {
    if (!incidentReportImportEnabled())
      throw new NotFoundException('Import de rapports introuvable.');
  }
}
