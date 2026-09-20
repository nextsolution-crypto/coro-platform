import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, ExerciseReportStatus, IncidentStatus, OperationalReviewConfidentiality, OperationalReviewPermission, OperationalReviewStatus, PopulationOperationalEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperationalReviewDto, UpdateOperationalReviewDto } from './dto/operational-review.dto';

export interface ReviewActor { sub: string; organizationId: string; clientId?: string; role: string; buildingIds?: string[] }

const reviewInclude = {
  populationEvidenceRecord: { select: { reference: true, version: true } },
  auditEvents: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class OperationalReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPermissions(actor: ReviewActor) {
    const user = await this.prisma.clientUser.findFirst({
      where: { id: actor.sub, organizationId: actor.organizationId, isActive: true },
      select: { operationalReviewPermissions: true },
    });
    if (!user) throw new ForbiddenException('Acces REX refuse');
    return user.operationalReviewPermissions;
  }

  private async requirePermission(actor: ReviewActor, permission: OperationalReviewPermission) {
    if (!(await this.getPermissions(actor)).includes(permission)) throw new ForbiddenException('Permission REX requise');
  }

  private async assertBuildingAccess(actor: ReviewActor, buildingId?: string | null) {
    if (!buildingId) return;
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId: actor.organizationId },
      select: { id: true, clientId: true },
    });
    if (!building) throw new NotFoundException('Batiment introuvable');
    if (actor.role !== 'CLIENT_MANAGER') return;
    if (actor.buildingIds?.length) {
      if (!actor.buildingIds.includes(building.id)) throw new ForbiddenException('Acces refuse a ce batiment');
    } else if (!actor.clientId || building.clientId !== actor.clientId) {
      throw new ForbiddenException('Acces refuse a ce batiment');
    }
  }

  private assertClientPortalConfidentiality(confidentiality?: OperationalReviewConfidentiality) {
    if (confidentiality === OperationalReviewConfidentiality.ADVISOR) {
      throw new ForbiddenException('La confidentialite ADVISOR est reservee au canal conseiller');
    }
  }

  private publicRecord(review: any) {
    return {
      id: review.id, reference: review.reference, version: review.version, status: review.status,
      confidentiality: review.confidentiality, title: review.title, summary: review.summary,
      buildingId: review.buildingId, projectId: review.projectId,
      populationOperationalEventId: review.populationOperationalEventId,
      incidentEventId: review.incidentEventId, exerciseReportId: review.exerciseReportId,
      evidenceRecordId: review.populationEvidenceRecordId,
      evidenceReference: review.populationEvidenceRecord?.reference ?? null,
      evidenceVersion: review.populationEvidenceRecord?.version ?? null,
      createdByType: review.createdByType, createdById: review.createdById,
      submittedAt: review.submittedAt, submittedByType: review.submittedByType, submittedById: review.submittedById,
      finalizedAt: review.finalizedAt, finalizedByType: review.finalizedByType, finalizedById: review.finalizedById,
      createdAt: review.createdAt, updatedAt: review.updatedAt, auditEvents: review.auditEvents,
    };
  }

  async create(dto: CreateOperationalReviewDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_CREATE);
    this.assertClientPortalConfidentiality(dto.confidentiality);
    if ([dto.populationOperationalEventId, dto.incidentEventId, dto.exerciseReportId].filter(Boolean).length !== 1) {
      throw new BadRequestException('Une source principale exacte est requise');
    }
    const context = await this.resolveSource(dto, actor);
    if (dto.buildingId && dto.buildingId !== context.buildingId) throw new BadRequestException('Le batiment ne correspond pas a la source');
    await this.assertBuildingAccess(actor, context.buildingId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'review:' + context.sourceKey}))`;
      const existing = await tx.operationalReview.findFirst({
        where: { organizationId: actor.organizationId, version: 1, supersedesId: null, ...context.sourceWhere },
        include: reviewInclude,
      });
      if (existing) return this.publicRecord(existing);
      const review = await tx.operationalReview.create({
        data: {
          organizationId: actor.organizationId, title: dto.title, summary: dto.summary,
          confidentiality: dto.confidentiality, buildingId: context.buildingId, projectId: context.projectId,
          populationOperationalEventId: dto.populationOperationalEventId,
          populationEvidenceRecordId: context.evidenceId, incidentEventId: dto.incidentEventId,
          exerciseReportId: dto.exerciseReportId, createdByType: CoroActorType.CLIENT_USER, createdById: actor.sub,
          auditEvents: { create: { type: 'CREATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { source: context.sourceKind } } },
        },
        include: reviewInclude,
      });
      return this.publicRecord(review);
    });
  }

  private async resolveSource(dto: CreateOperationalReviewDto, actor: ReviewActor) {
    if (dto.populationOperationalEventId) {
      const event = await this.prisma.populationOperationalEvent.findFirst({
        where: { id: dto.populationOperationalEventId, organizationId: actor.organizationId, status: PopulationOperationalEventStatus.ENDED },
        select: {
          id: true, program: { select: { rueFacilityProfile: { select: { buildingId: true } } } },
          evidenceRecords: { where: { status: 'FINALIZED' }, orderBy: { version: 'desc' }, take: 1, select: { id: true } },
        },
      });
      if (!event) throw new BadRequestException('Evenement Population termine introuvable');
      return { sourceKind: 'POPULATION', sourceKey: event.id, sourceWhere: { populationOperationalEventId: event.id }, buildingId: event.program.rueFacilityProfile.buildingId, projectId: null, evidenceId: event.evidenceRecords[0]?.id ?? null };
    }
    if (dto.incidentEventId) {
      const incident = await this.prisma.incidentEvent.findFirst({
        where: { id: dto.incidentEventId, organizationId: actor.organizationId, status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED] } },
        select: { id: true, buildingId: true },
      });
      if (!incident) throw new BadRequestException('Incident termine introuvable');
      return { sourceKind: 'INCIDENT', sourceKey: incident.id, sourceWhere: { incidentEventId: incident.id }, buildingId: incident.buildingId, projectId: null, evidenceId: null };
    }
    const report = await this.prisma.exerciseReport.findFirst({
      where: { id: dto.exerciseReportId, organizationId: actor.organizationId, status: ExerciseReportStatus.PUBLISHED },
      select: { id: true, buildingId: true, projectId: true },
    });
    if (!report) throw new BadRequestException("Rapport d'exercice publie introuvable");
    return { sourceKind: 'EXERCISE', sourceKey: report.id, sourceWhere: { exerciseReportId: report.id }, buildingId: report.buildingId, projectId: report.projectId, evidenceId: null };
  }

  async get(id: string, actor: ReviewActor) { return this.publicRecord(await this.scoped(id, actor)); }

  async update(id: string, dto: UpdateOperationalReviewDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    this.assertClientPortalConfidentiality(dto.confidentiality);
    const current = await this.scoped(id, actor);
    if (current.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Seul un REX brouillon peut etre modifie');
    const review = await this.prisma.operationalReview.update({
      where: { id }, data: { ...dto, auditEvents: { create: { type: 'UPDATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { fields: Object.keys(dto) } } } }, include: reviewInclude,
    });
    return this.publicRecord(review);
  }

  async submit(id: string, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_REVIEW);
    return this.transition(id, actor, OperationalReviewStatus.DRAFT, OperationalReviewStatus.IN_REVIEW, 'SUBMITTED');
  }

  async finalize(id: string, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_FINALIZE);
    const current = await this.scoped(id, actor);
    if (current.status === OperationalReviewStatus.FINALIZED) return this.publicRecord(current);
    return this.transition(id, actor, OperationalReviewStatus.IN_REVIEW, OperationalReviewStatus.FINALIZED, 'FINALIZED');
  }

  private async transition(id: string, actor: ReviewActor, expected: OperationalReviewStatus, status: OperationalReviewStatus, type: 'SUBMITTED' | 'FINALIZED') {
    const current = await this.scoped(id, actor);
    if (current.status !== expected) throw new ConflictException('Transition REX invalide');
    const now = new Date();
    const review = await this.prisma.operationalReview.update({
      where: { id },
      data: {
        status,
        ...(status === OperationalReviewStatus.IN_REVIEW
          ? { submittedAt: now, submittedByType: CoroActorType.CLIENT_USER, submittedById: actor.sub }
          : { finalizedAt: now, finalizedByType: CoroActorType.CLIENT_USER, finalizedById: actor.sub }),
        auditEvents: { create: { type, actorType: CoroActorType.CLIENT_USER, actorId: actor.sub } },
      },
      include: reviewInclude,
    });
    return this.publicRecord(review);
  }

  private async scoped(id: string, actor: ReviewActor) {
    const permissions = await this.getPermissions(actor);
    if (permissions.length === 0) throw new ForbiddenException('Permission REX requise');
    const review = await this.prisma.operationalReview.findFirst({ where: { id, organizationId: actor.organizationId }, include: reviewInclude });
    if (!review) throw new NotFoundException('REX introuvable');
    if (review.confidentiality === OperationalReviewConfidentiality.ADVISOR) throw new ForbiddenException('REX reserve au canal conseiller');
    if (review.confidentiality === OperationalReviewConfidentiality.RESTRICTED && !permissions.includes(OperationalReviewPermission.REX_EDIT) && !permissions.includes(OperationalReviewPermission.REX_REVIEW) && !permissions.includes(OperationalReviewPermission.REX_FINALIZE)) {
      throw new ForbiddenException('Acces refuse a ce REX restreint');
    }
    if (review.confidentiality !== OperationalReviewConfidentiality.ORGANIZATION) await this.assertBuildingAccess(actor, review.buildingId);
    return review;
  }
}
