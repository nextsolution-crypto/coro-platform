import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PlatformPermission, Prisma } from '@prisma/client';
import {
  ensureProvenanceActor,
  ProvenanceActor,
  provenanceActor,
  provenanceData,
} from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { operationalLogEnabled } from './operational-log.config';
import { OperationalLogAccessService } from './operational-log-access.service';
import {
  AssociateOperationalLogReportDto,
  CreateOperationalLogEntryDto,
  OperationalLogListQueryDto,
  UpdateOperationalLogEntryDto,
} from './dto/operational-log.dto';

const entrySelect = {
  id: true,
  organizationId: true,
  buildingId: true,
  floorId: true,
  zoneId: true,
  incidentEventId: true,
  incidentReportId: true,
  shiftId: true,
  eventAt: true,
  recordedAt: true,
  authorUserId: true,
  shiftReference: true,
  locationLabel: true,
  activityType: true,
  category: true,
  subcategory: true,
  priority: true,
  description: true,
  people: true,
  vehicles: true,
  equipment: true,
  actionsTaken: true,
  status: true,
  followUpRequired: true,
  followUpSummary: true,
  lockVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OperationalLogEntrySelect;

@Injectable()
export class OperationalLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: OperationalLogAccessService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateOperationalLogEntryDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    await this.access.require(
      actor,
      organizationId,
      dto.buildingId,
      PlatformPermission.OPERATIONAL_LOG_CREATE,
    );
    this.validateText(dto.description);
    const replay = await this.prisma.operationalLogEntry.findUnique({
      where: {
        organizationId_creationIdempotencyKey: {
          organizationId,
          creationIdempotencyKey: dto.idempotencyKey,
        },
      },
      select: entrySelect,
    });
    if (replay) return replay;

    await this.validateScope(organizationId, dto);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await ensureProvenanceActor(tx, actor);
          const provenance = provenanceActor(actor);
          const duplicate = await tx.operationalLogEntry.findUnique({
            where: {
              organizationId_creationIdempotencyKey: {
                organizationId,
                creationIdempotencyKey: dto.idempotencyKey,
              },
            },
            select: entrySelect,
          });
          if (duplicate) return duplicate;
          return tx.operationalLogEntry.create({
            data: {
              organizationId,
              buildingId: dto.buildingId,
              floorId: dto.floorId,
              zoneId: dto.zoneId,
              incidentEventId: dto.incidentEventId,
              shiftId: dto.shiftId,
              eventAt: new Date(dto.eventAt),
              authorUserId:
                provenance.actorType === 'USER' ? provenance.actorId : null,
              authorActorType: provenanceData(actor).actorType,
              authorActorId: provenance.actorId,
              shiftReference: dto.shiftReference?.trim(),
              locationLabel: dto.locationLabel?.trim(),
              activityType: dto.activityType.trim(),
              category: dto.category.trim(),
              subcategory: dto.subcategory?.trim(),
              priority: dto.priority,
              description: dto.description.trim(),
              people: this.json(dto.people),
              vehicles: this.json(dto.vehicles),
              equipment: this.json(dto.equipment),
              actionsTaken: this.json(dto.actionsTaken),
              followUpRequired: dto.followUpRequired ?? false,
              followUpSummary: dto.followUpSummary?.trim(),
              creationIdempotencyKey: dto.idempotencyKey,
              auditEvents: {
                create: {
                  action: 'OPERATIONAL_LOG_ENTRY_CREATED',
                  actorUserId:
                    provenance.actorType === 'USER' ? provenance.actorId : null,
                  ...provenanceData(actor),
                  idempotencyKey: dto.idempotencyKey,
                },
              },
            },
            select: entrySelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.operationalLogEntry.findUnique({
          where: {
            organizationId_creationIdempotencyKey: {
              organizationId,
              creationIdempotencyKey: dto.idempotencyKey,
            },
          },
          select: entrySelect,
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async list(
    organizationId: string,
    query: OperationalLogListQueryDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    await this.access.require(
      actor,
      organizationId,
      query.buildingId,
      PlatformPermission.OPERATIONAL_LOG_READ,
    );
    const where: Prisma.OperationalLogEntryWhereInput = {
      organizationId,
      buildingId: query.buildingId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.from || query.to
        ? {
            eventAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { description: { contains: query.q, mode: 'insensitive' } },
              { category: { contains: query.q, mode: 'insensitive' } },
              { locationLabel: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.operationalLogEntry.findMany({
        where,
        select: entrySelect,
        orderBy: [{ eventAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.operationalLogEntry.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async get(organizationId: string, id: string, actor: ProvenanceActor) {
    this.assertEnabled();
    const entry = await this.prisma.operationalLogEntry.findFirst({
      where: { id, organizationId },
      select: entrySelect,
    });
    if (!entry) this.missing();
    await this.access.require(
      actor,
      organizationId,
      entry.buildingId,
      PlatformPermission.OPERATIONAL_LOG_READ,
    );
    return entry;
  }

  async history(organizationId: string, id: string, actor: ProvenanceActor) {
    const entry = await this.get(organizationId, id, actor);
    return this.prisma.operationalLogEntryRevision.findMany({
      where: { organizationId, entryId: entry.id },
      orderBy: { revisionNumber: 'asc' },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateOperationalLogEntryDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    if (dto.description) this.validateText(dto.description);
    const existing = await this.prisma.operationalLogEntry.findFirst({
      where: { id, organizationId },
      select: entrySelect,
    });
    if (!existing) this.missing();
    await this.access.require(
      actor,
      organizationId,
      existing.buildingId,
      PlatformPermission.OPERATIONAL_LOG_EDIT,
    );
    const replay = await this.prisma.operationalLogEntryRevision.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (replay) return this.get(organizationId, id, actor);

    const after = {
      ...existing,
      ...this.mutable(dto),
      lockVersion: existing.lockVersion + 1,
    };
    const contentHash = createHash('sha256')
      .update(JSON.stringify(after))
      .digest('hex');
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await ensureProvenanceActor(tx, actor);
          const provenance = provenanceActor(actor);
          const updated = await tx.operationalLogEntry.updateMany({
            where: {
              id,
              organizationId,
              lockVersion: dto.expectedLockVersion,
            },
            data: { ...this.mutable(dto), lockVersion: { increment: 1 } },
          });
          if (updated.count !== 1)
            throw new ConflictException(
              'L’entrée a été modifiée. Rechargez-la.',
            );
          const revisionNumber =
            (await tx.operationalLogEntryRevision.count({
              where: { organizationId, entryId: id },
            })) + 1;
          await tx.operationalLogEntryRevision.create({
            data: {
              organizationId,
              entryId: id,
              revisionNumber,
              reason: dto.correctionReason.trim(),
              beforeSnapshot: this.snapshot(existing),
              afterSnapshot: this.snapshot(after),
              contentHash,
              authorUserId:
                provenance.actorType === 'USER' ? provenance.actorId : null,
              authorActorType: provenanceData(actor).actorType,
              authorActorId: provenance.actorId,
              idempotencyKey: dto.idempotencyKey,
            },
          });
          await tx.operationalLogAuditEvent.create({
            data: {
              organizationId,
              entryId: id,
              action: 'OPERATIONAL_LOG_ENTRY_CORRECTED',
              actorUserId:
                provenance.actorType === 'USER' ? provenance.actorId : null,
              ...provenanceData(actor),
              reason: dto.correctionReason.trim(),
              idempotencyKey: dto.idempotencyKey,
              metadata: { revisionNumber },
            },
          });
          return tx.operationalLogEntry.findUniqueOrThrow({
            where: { id_organizationId: { id, organizationId } },
            select: entrySelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.get(organizationId, id, actor);
      }
      throw error;
    }
  }

  async associateReport(
    organizationId: string,
    id: string,
    dto: AssociateOperationalLogReportDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    const entry = await this.prisma.operationalLogEntry.findFirst({
      where: { id, organizationId },
      select: { buildingId: true, incidentReportId: true },
    });
    if (!entry) this.missing();
    await this.access.require(
      actor,
      organizationId,
      entry.buildingId,
      PlatformPermission.OPERATIONAL_LOG_EDIT,
    );
    const report = await this.prisma.incidentReport.findFirst({
      where: { id: dto.reportId, organizationId, buildingId: entry.buildingId },
      select: { id: true },
    });
    if (!report) throw new NotFoundException('Rapport CORO introuvable.');
    if (entry.incidentReportId && entry.incidentReportId !== report.id) {
      throw new ConflictException(
        'Cette entrée est déjà associée à un autre rapport.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await ensureProvenanceActor(tx, actor);
      const provenance = provenanceActor(actor);
      const updated = await tx.operationalLogEntry.updateMany({
        where: { id, organizationId, lockVersion: dto.expectedLockVersion },
        data: { incidentReportId: report.id, lockVersion: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException('L’entrée a été modifiée. Rechargez-la.');
      await tx.operationalLogAuditEvent.create({
        data: {
          organizationId,
          entryId: id,
          action: 'OPERATIONAL_LOG_REPORT_ASSOCIATED',
          actorUserId:
            provenance.actorType === 'USER' ? provenance.actorId : null,
          ...provenanceData(actor),
          reason: dto.reason.trim(),
          idempotencyKey: dto.idempotencyKey,
          metadata: { reportId: report.id },
        },
      });
      return tx.operationalLogEntry.findUniqueOrThrow({
        where: { id_organizationId: { id, organizationId } },
        select: entrySelect,
      });
    });
  }

  private async validateScope(
    organizationId: string,
    dto: CreateOperationalLogEntryDto,
  ) {
    if (dto.zoneId && !dto.floorId) {
      throw new BadRequestException('floorId est requis avec zoneId.');
    }
    const [floor, zone, incident, shift] = await Promise.all([
      dto.floorId
        ? this.prisma.buildingFloor.findFirst({
            where: {
              id: dto.floorId,
              organizationId,
              buildingId: dto.buildingId,
              status: 'ACTIVE',
            },
            select: { id: true },
          })
        : null,
      dto.zoneId
        ? this.prisma.buildingZone.findFirst({
            where: {
              id: dto.zoneId,
              organizationId,
              buildingId: dto.buildingId,
              floorId: dto.floorId,
              status: 'ACTIVE',
            },
            select: { id: true },
          })
        : null,
      dto.incidentEventId
        ? this.prisma.incidentEvent.findFirst({
            where: {
              id: dto.incidentEventId,
              organizationId,
              buildingId: dto.buildingId,
            },
            select: { id: true },
          })
        : null,
      dto.shiftId
        ? this.prisma.operationalShift.findFirst({
            where: {
              id: dto.shiftId,
              organizationId,
              buildingId: dto.buildingId,
              status: { in: ['OPEN', 'HANDOVER_PENDING'] },
            },
            select: { id: true },
          })
        : null,
    ]);
    if (
      (dto.floorId && !floor) ||
      (dto.zoneId && !zone) ||
      (dto.incidentEventId && !incident) ||
      (dto.shiftId && !shift)
    ) {
      throw new NotFoundException('Périmètre de main courante introuvable.');
    }
  }

  private mutable(
    dto: UpdateOperationalLogEntryDto,
  ): Prisma.OperationalLogEntryUpdateManyMutationInput {
    return {
      ...(dto.locationLabel !== undefined
        ? { locationLabel: dto.locationLabel.trim() }
        : {}),
      ...(dto.activityType !== undefined
        ? { activityType: dto.activityType.trim() }
        : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
      ...(dto.subcategory !== undefined
        ? { subcategory: dto.subcategory.trim() }
        : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.people !== undefined ? { people: this.json(dto.people) } : {}),
      ...(dto.vehicles !== undefined
        ? { vehicles: this.json(dto.vehicles) }
        : {}),
      ...(dto.equipment !== undefined
        ? { equipment: this.json(dto.equipment) }
        : {}),
      ...(dto.actionsTaken !== undefined
        ? { actionsTaken: this.json(dto.actionsTaken) }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.followUpRequired !== undefined
        ? { followUpRequired: dto.followUpRequired }
        : {}),
      ...(dto.followUpSummary !== undefined
        ? { followUpSummary: dto.followUpSummary.trim() }
        : {}),
    };
  }

  private json(
    value: Record<string, unknown>[] | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.InputJsonArray);
  }

  private snapshot(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private validateText(value: string): void {
    const hasForbiddenControl = [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    });
    if (/[<>]/u.test(value) || hasForbiddenControl) {
      throw new BadRequestException(
        'Le texte HTML, les scripts et les caractères de contrôle sont interdits.',
      );
    }
  }

  private assertEnabled(): void {
    if (!operationalLogEnabled()) this.missing();
  }

  private missing(): never {
    throw new NotFoundException('Entrée de main courante introuvable.');
  }
}
