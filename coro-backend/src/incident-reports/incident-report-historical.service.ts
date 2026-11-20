import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPermission, Prisma } from '@prisma/client';
import type { ProvenanceActor } from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { IncidentReportHistoricalListQueryDto } from './dto/incident-report-historical.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import { incidentReportArchivesEnabled } from './incident-reports.config';

@Injectable()
export class IncidentReportHistoricalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IncidentReportAccessService,
  ) {}

  async list(
    organizationId: string,
    query: IncidentReportHistoricalListQueryDto,
    actor: ProvenanceActor,
  ) {
    this.assertEnabled();
    this.assertDates(query);
    await this.access.require(
      actor,
      organizationId,
      query.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
    );
    const importedToExclusive = this.exclusiveDate(query.importedTo);
    const where: Prisma.IncidentReportHistoricalRecordWhereInput = {
      organizationId,
      buildingId: query.buildingId,
      status: 'ACTIVE',
      ...(query.sourceSystem
        ? { sourceSystem: query.sourceSystem.trim().toUpperCase() }
        : {}),
      ...(query.q
        ? { searchText: { contains: query.q.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.importedFrom || query.importedTo
        ? {
            importedAt: {
              ...(query.importedFrom
                ? { gte: new Date(query.importedFrom) }
                : {}),
              ...(importedToExclusive
                ? { lt: importedToExclusive }
                : query.importedTo
                  ? { lte: new Date(query.importedTo) }
                  : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.incidentReportHistoricalRecord.findMany({
        where,
        orderBy: [{ importedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          sourceSystem: true,
          sourceObjectType: true,
          sourceObjectId: true,
          sourceSchemaVersion: true,
          sourceHash: true,
          mappedContent: true,
          provenanceManifest: true,
          status: true,
          importedAt: true,
        },
      }),
      this.prisma.incidentReportHistoricalRecord.count({ where }),
    ]);
    return {
      items: items.map((item) => this.summary(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(organizationId: string, id: string, actor: ProvenanceActor) {
    this.assertEnabled();
    const record = await this.prisma.incidentReportHistoricalRecord.findFirst({
      where: { id, organizationId, status: 'ACTIVE' },
    });
    if (!record) throw new NotFoundException('Archive historique introuvable.');
    await this.access.require(
      actor,
      organizationId,
      record.buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
    );
    return {
      ...record,
      provenanceKind: 'HISTORICAL_IMPORT',
      nativeCoroApproval: false,
      warning:
        'Archive importée. Elle ne constitue pas une approbation native CORO.',
    };
  }

  private summary<T extends { mappedContent: unknown; sourceObjectId: string }>(
    item: T,
  ) {
    const mapped = item.mappedContent as Record<string, unknown>;
    return {
      ...item,
      title:
        mapped.title ??
        mapped['incident.title'] ??
        mapped.reportNumber ??
        item.sourceObjectId,
      provenanceKind: 'HISTORICAL_IMPORT',
      nativeCoroApproval: false,
    };
  }

  private assertDates(query: IncidentReportHistoricalListQueryDto) {
    if (
      query.importedFrom &&
      query.importedTo &&
      new Date(query.importedFrom) > new Date(query.importedTo)
    )
      throw new BadRequestException(
        'La date de début doit précéder la date de fin.',
      );
  }

  private exclusiveDate(value?: string) {
    if (!value?.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private assertEnabled() {
    if (!incidentReportArchivesEnabled())
      throw new NotFoundException('Archive historique introuvable.');
  }
}
