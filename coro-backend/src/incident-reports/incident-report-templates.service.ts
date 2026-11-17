import { Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, PlatformPermission, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { PublishIncidentReportTemplateDto } from './dto/incident-report.dto';
import { IncidentReportAccessService } from './incident-report-access.service';
import {
  INCIDENT_REPORT_FIELD_TYPES,
  INITIAL_INCIDENT_REPORT_TEMPLATES,
  validateFormSchema,
} from './incident-report-form-engine';
import { incidentReportsEnabled } from './incident-reports.config';

@Injectable()
export class IncidentReportTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IncidentReportAccessService,
  ) {}
  catalog() {
    return {
      fieldTypes: INCIDENT_REPORT_FIELD_TYPES,
      initialTemplates: INITIAL_INCIDENT_REPORT_TEMPLATES,
    };
  }
  async list(organizationId: string, actor: AdviserActor, buildingId: string) {
    this.enabled();
    await this.access.require(
      actor,
      organizationId,
      buildingId,
      PlatformPermission.INCIDENT_REPORT_READ,
    );
    const [templates, policies] = await Promise.all([
      this.prisma.incidentReportTemplateVersion.findMany({
        where: { organizationId, status: 'PUBLISHED' },
        orderBy: [{ name: 'asc' }, { version: 'desc' }],
      }),
      this.prisma.incidentReportRetentionPolicy.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, reportType: true },
      }),
    ]);
    const policyByType = new Map(
      policies.map((policy) => [policy.reportType, policy.id]),
    );
    return templates.map((template) => ({
      ...template,
      retentionPolicyId: policyByType.get(template.reportType) ?? null,
    }));
  }
  async publish(
    organizationId: string,
    dto: PublishIncidentReportTemplateDto,
    actor: AdviserActor,
  ) {
    this.enabled();
    await this.access.require(
      actor,
      organizationId,
      dto.buildingId,
      PlatformPermission.INCIDENT_REPORT_ADMIN,
    );
    const formSchema = validateFormSchema(dto.formSchema);
    const canonical = JSON.stringify({
      formSchema,
      fieldCatalog: dto.fieldCatalog,
      mappingMetadata: dto.mappingMetadata ?? null,
    });
    const contentHash = createHash('sha256').update(canonical).digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        const latest = await tx.incidentReportTemplateVersion.findFirst({
          where: { organizationId, templateKey: dto.templateKey },
          orderBy: { version: 'desc' },
          select: { version: true, contentHash: true, id: true },
        });
        if (latest?.contentHash === contentHash)
          return tx.incidentReportTemplateVersion.findUniqueOrThrow({
            where: { id: latest.id },
          });
        return tx.incidentReportTemplateVersion.create({
          data: {
            organizationId,
            templateKey: dto.templateKey,
            version: (latest?.version ?? 0) + 1,
            name: dto.name,
            reportType: dto.reportType,
            status: 'PUBLISHED',
            schemaVersion: '1.0',
            formSchema: formSchema as unknown as Prisma.InputJsonValue,
            fieldCatalog: dto.fieldCatalog as Prisma.InputJsonValue,
            mappingMetadata: dto.mappingMetadata as
              | Prisma.InputJsonValue
              | undefined,
            contentHash,
            publishedAt: new Date(),
            createdByActorType: CoroActorType.USER,
            createdByActorId: actor.userId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  private enabled() {
    if (!incidentReportsEnabled())
      throw new NotFoundException('Rapports incident indisponibles.');
  }
}
