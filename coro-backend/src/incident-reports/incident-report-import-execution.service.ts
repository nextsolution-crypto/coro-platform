import {
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
  ProcessIncidentReportImportRunDto,
  RollbackIncidentReportImportRunDto,
  StartIncidentReportImportRunDto,
} from './dto/incident-report-import-execution.dto';
import type { IncidentReportImportMappingRuleDto } from './dto/incident-report-import-mapping.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportImportMappingService } from './incident-report-import-mapping.service';
import { IncidentReportImportService } from './incident-report-import.service';
import { incidentReportImportEnabled } from './incident-reports.config';

@Injectable()
export class IncidentReportImportExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imports: IncidentReportImportService,
    private readonly mappings: IncidentReportImportMappingService,
    private readonly access: IncidentReportAccessService,
  ) {}

  async start(
    organizationId: string,
    batchId: string,
    dto: StartIncidentReportImportRunDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const batch = await this.requireBatch(organizationId, batchId, actor);
    if (batch.status !== 'READY')
      throw new ConflictException(
        'Le lot doit avoir une prévisualisation sans conflit.',
      );
    const existing = await this.prisma.incidentReportImportRun.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing) return existing;
    const [file, mapping, preview] = await Promise.all([
      this.prisma.incidentReportImportFile.findFirst({
        where: { id: dto.fileId, batchId, organizationId, status: 'ANALYZED' },
      }),
      this.prisma.incidentReportImportMapping.findFirst({
        where: { id: dto.mappingId, batchId, organizationId, isActive: true },
      }),
      this.prisma.incidentReportImportPreview.findFirst({
        where: {
          organizationId,
          batchId,
          fileId: dto.fileId,
          mappingId: dto.mappingId,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!file || !mapping || !preview)
      throw new NotFoundException('Prévisualisation d’import introuvable.');
    const summary = preview.summary as Record<string, unknown>;
    if (Number(summary.conflictCount) !== 0)
      throw new ConflictException(
        'Les conflits de prévisualisation doivent être résolus.',
      );
    if (
      preview.sourceFileHash !== file.sha256 ||
      preview.mappingHash !== mapping.rulesHash
    )
      throw new ConflictException(
        'La prévisualisation ne correspond plus aux sources actives.',
      );
    const provenance = provenanceData(actor);
    return this.prisma.$transaction(async (tx) => {
      await ensureProvenanceActor(tx, actor);
      const run = await tx.incidentReportImportRun.create({
        data: {
          organizationId,
          buildingId: batch.buildingId,
          batchId,
          fileId: file.id,
          mappingId: mapping.id,
          totalRecords: file.recordCount ?? 0,
          idempotencyKey: dto.idempotencyKey,
          createdByActorType: provenance.actorType,
          createdByActorId: provenance.actorId,
        },
      });
      await tx.incidentReportImportEvent.create({
        data: {
          organizationId,
          batchId,
          action: 'IMPORT_RUN_CREATED',
          actorType: provenance.actorType,
          actorId: provenance.actorId,
          idempotencyKey: `${dto.idempotencyKey}:event`,
          metadata: { runId: run.id, totalRecords: run.totalRecords },
        },
      });
      return run;
    });
  }

  async get(organizationId: string, runId: string, actor: ProvenanceActor) {
    this.assertEnabled();
    const run = await this.requireRun(organizationId, runId, actor);
    return {
      ...run,
      reconciliation: await this.reconcileInternal(organizationId, runId, run),
    };
  }

  async processNext(
    organizationId: string,
    runId: string,
    dto: ProcessIncidentReportImportRunDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const run = await this.requireRun(organizationId, runId, actor);
    if (!['PENDING', 'RUNNING'].includes(run.status))
      throw new ConflictException('Cette exécution ne peut plus être reprise.');
    const claimed = await this.prisma.incidentReportImportRun.updateMany({
      where: {
        id: runId,
        organizationId,
        lockVersion: dto.expectedLockVersion,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      data: {
        status: 'RUNNING',
        startedAt: run.startedAt ?? new Date(),
        lockVersion: { increment: 1 },
      },
    });
    if (claimed.count !== 1)
      throw new ConflictException(
        'Exécution modifiée concurremment. Rechargez son état.',
      );
    const claimedVersion = dto.expectedLockVersion + 1;
    const [mapping, batch, source] = await Promise.all([
      this.prisma.incidentReportImportMapping.findFirst({
        where: { id: run.mappingId, organizationId, batchId: run.batchId },
      }),
      this.prisma.incidentReportImportBatch.findFirst({
        where: { id: run.batchId, organizationId },
      }),
      this.imports.loadPreviewRecords(
        organizationId,
        run.batchId,
        run.fileId,
        dto.batchSize,
        run.cursor,
      ),
    ]);
    if (!mapping || !batch)
      throw new NotFoundException('Configuration d’import introuvable.');
    const mapped = this.mappings.mapRecords(
      source.headers,
      source.records,
      mapping.rules as unknown as IncidentReportImportMappingRuleDto[],
    );
    const provenance = provenanceData(actor);
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        const current = await tx.incidentReportImportRun.findFirst({
          where: {
            id: runId,
            organizationId,
            lockVersion: claimedVersion,
            cursor: run.cursor,
          },
        });
        if (!current)
          throw new ConflictException('Exécution modifiée concurremment.');
        let imported = 0;
        let duplicates = 0;
        let conflicts = 0;
        for (let index = 0; index < source.records.length; index += 1) {
          const sourceRow = run.cursor + index + 1;
          const original = this.json(source.records[index]);
          const sample = mapped.samples[index];
          const sourceHash = this.hash(original);
          const sourceObjectId = this.sourceObjectId(original, sourceHash);
          const alreadyProcessed = await tx.incidentReportImportItem.findUnique(
            {
              where: {
                organizationId_runId_sourceRow: {
                  organizationId,
                  runId,
                  sourceRow,
                },
              },
            },
          );
          if (alreadyProcessed) continue;
          if (!sample.valid) {
            conflicts += 1;
            await tx.incidentReportImportItem.create({
              data: {
                organizationId,
                runId,
                sourceRow,
                sourceObjectId,
                sourceHash,
                status: 'CONFLICT',
                errorCode: 'MAPPING_CONFLICT',
              },
            });
            continue;
          }
          const duplicate = await tx.incidentReportHistoricalRecord.findUnique({
            where: {
              organizationId_sourceSystem_sourceObjectType_sourceObjectId: {
                organizationId,
                sourceSystem: batch.sourceSystem,
                sourceObjectType: 'INCIDENT_REPORT',
                sourceObjectId,
              },
            },
          });
          if (duplicate) {
            duplicates += 1;
            await tx.incidentReportImportItem.create({
              data: {
                organizationId,
                runId,
                sourceRow,
                sourceObjectId,
                sourceHash,
                status: 'DUPLICATE',
                historicalRecordId: duplicate.id,
              },
            });
            continue;
          }
          const historical = await tx.incidentReportHistoricalRecord.create({
            data: {
              organizationId,
              buildingId: run.buildingId,
              importBatchId: run.batchId,
              importRunId: run.id,
              sourceSystem: batch.sourceSystem,
              sourceObjectType: 'INCIDENT_REPORT',
              sourceObjectId,
              sourceSchemaVersion: batch.sourceSchemaVersion,
              sourceHash,
              searchText: this.searchText(
                sample.mapped,
                original,
                sourceObjectId,
              ),
              mappedContent: this.json(sample.mapped) as Prisma.InputJsonValue,
              originalContent: original as Prisma.InputJsonValue,
              provenanceManifest: {
                origin: 'HISTORICAL_IMPORT',
                nativeCoroApproval: false,
                batchId: run.batchId,
                runId: run.id,
                sourceFileHash: source.sourceFileHash,
                mappingHash: mapping.rulesHash,
              },
            },
          });
          imported += 1;
          await tx.incidentReportImportItem.create({
            data: {
              organizationId,
              runId,
              sourceRow,
              sourceObjectId,
              sourceHash,
              status: 'IMPORTED',
              historicalRecordId: historical.id,
            },
          });
        }
        const cursor = run.cursor + source.records.length;
        const completed = cursor >= run.totalRecords;
        const updated = await tx.incidentReportImportRun.update({
          where: { id: runId },
          data: {
            cursor,
            importedCount: { increment: imported },
            duplicateCount: { increment: duplicates },
            conflictCount: { increment: conflicts },
            status: completed ? 'COMPLETED' : 'RUNNING',
            completedAt: completed ? new Date() : null,
          },
        });
        await tx.incidentReportImportBatch.update({
          where: { id: run.batchId },
          data: {
            status: completed ? 'COMPLETED' : 'IMPORTING',
            lockVersion: { increment: 1 },
          },
        });
        await tx.incidentReportImportEvent.create({
          data: {
            organizationId,
            batchId: run.batchId,
            action: completed ? 'IMPORT_COMPLETED' : 'IMPORT_CHUNK_COMPLETED',
            actorType: provenance.actorType,
            actorId: provenance.actorId,
            idempotencyKey: dto.idempotencyKey,
            metadata: {
              runId,
              from: run.cursor,
              to: cursor,
              imported,
              duplicates,
              conflicts,
            },
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reconcile(
    organizationId: string,
    runId: string,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const run = await this.requireRun(organizationId, runId, actor);
    return this.reconcileInternal(organizationId, runId, run);
  }

  async rollback(
    organizationId: string,
    runId: string,
    dto: RollbackIncidentReportImportRunDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const run = await this.requireRun(organizationId, runId, actor);
    if (run.status !== 'COMPLETED')
      throw new ConflictException(
        'Seule une importation terminée peut être annulée.',
      );
    if (run.lockVersion !== dto.expectedLockVersion)
      throw new ConflictException('Exécution modifiée concurremment.');
    const provenance = provenanceData(actor);
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        const records = await tx.incidentReportHistoricalRecord.updateMany({
          where: { organizationId, importRunId: runId, status: 'ACTIVE' },
          data: { status: 'ROLLED_BACK', rolledBackAt: new Date() },
        });
        await tx.incidentReportImportItem.updateMany({
          where: { organizationId, runId, status: 'IMPORTED' },
          data: { status: 'ROLLED_BACK' },
        });
        const updated = await tx.incidentReportImportRun.update({
          where: { id: runId },
          data: {
            status: 'ROLLED_BACK',
            rolledBackAt: new Date(),
            lockVersion: { increment: 1 },
          },
        });
        await tx.incidentReportImportBatch.update({
          where: { id: run.batchId },
          data: { status: 'ROLLED_BACK', lockVersion: { increment: 1 } },
        });
        await tx.incidentReportImportEvent.create({
          data: {
            organizationId,
            batchId: run.batchId,
            action: 'IMPORT_ROLLED_BACK',
            actorType: provenance.actorType,
            actorId: provenance.actorId,
            idempotencyKey: dto.idempotencyKey,
            metadata: { runId, recordCount: records.count, reason: dto.reason },
          },
        });
        return { run: updated, rolledBackRecords: records.count };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async reconcileInternal(
    organizationId: string,
    runId: string,
    run: {
      cursor: number;
      importedCount: number;
      duplicateCount: number;
      conflictCount: number;
      failedCount: number;
    },
  ) {
    const [items, activeRecords] = await Promise.all([
      this.prisma.incidentReportImportItem.groupBy({
        by: ['status'],
        where: { organizationId, runId },
        _count: { _all: true },
      }),
      this.prisma.incidentReportHistoricalRecord.count({
        where: { organizationId, importRunId: runId, status: 'ACTIVE' },
      }),
    ]);
    const counts = Object.fromEntries(
      items.map((item) => [item.status, item._count._all]),
    );
    return {
      cursor: run.cursor,
      counts,
      activeRecords,
      consistent:
        run.cursor ===
          Object.values(counts).reduce((sum, value) => sum + value, 0) &&
        activeRecords === (counts.IMPORTED ?? 0) &&
        run.importedCount === (counts.IMPORTED ?? 0) &&
        run.duplicateCount === (counts.DUPLICATE ?? 0) &&
        run.conflictCount === (counts.CONFLICT ?? 0) &&
        run.failedCount === (counts.FAILED ?? 0),
    };
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

  private async requireRun(
    organizationId: string,
    runId: string,
    actor: ProvenanceActor,
  ) {
    const run = await this.prisma.incidentReportImportRun.findFirst({
      where: { id: runId, organizationId },
    });
    if (!run) throw new NotFoundException('Exécution d’import introuvable.');
    await this.access.require(
      actor,
      organizationId,
      run.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    return run;
  }

  private sourceObjectId(record: Record<string, unknown>, hash: string) {
    for (const key of ['legacy_id', 'source_id', 'id', 'reportNumber']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim())
        return value.trim().slice(0, 200);
      if (typeof value === 'number' && Number.isFinite(value))
        return String(value);
    }
    return `sha256:${hash}`;
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private searchText(
    mapped: Record<string, unknown>,
    original: Record<string, unknown>,
    sourceObjectId: string,
  ) {
    const values = [
      sourceObjectId,
      mapped.title,
      mapped.reportNumber,
      mapped['incident.title'],
      mapped['incident.category'],
      original.title,
      original.reportNumber,
      original.category,
    ];
    return values
      .filter((value): value is string | number =>
        ['string', 'number'].includes(typeof value),
      )
      .map(String)
      .join(' ')
      .slice(0, 2000);
  }

  private json(value: unknown): Record<string, unknown> {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }

  private assertEnabled() {
    if (!incidentReportImportEnabled())
      throw new NotFoundException('Import de rapports introuvable.');
  }
}
