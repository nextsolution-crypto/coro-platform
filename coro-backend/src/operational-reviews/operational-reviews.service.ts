import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, ExerciseReportStatus, IncidentStatus, OperationalReviewConfidentiality, OperationalReviewPermission, OperationalReviewStatus, PopulationOperationalEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperationalReviewDto, UpdateOperationalReviewDto } from './dto/operational-review.dto';
import { ChangeReviewFindingStatusDto, CreateReviewFindingDto, CreateReviewRecommendationDto, DecideReviewRecommendationDto, UpdateReviewFindingDto, UpdateReviewRecommendationDto } from './dto/review-content.dto';

export interface ReviewActor { sub: string; organizationId: string; clientId?: string; role: string; buildingIds?: string[] }

const reviewInclude = {
  populationEvidenceRecord: { select: { reference: true, version: true } },
  auditEvents: { orderBy: { createdAt: 'asc' as const } },
  findings: {
    orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: { recommendations: { orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }] } },
  },
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
      findings: review.findings ?? [],
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

  async createFinding(reviewId: string, dto: CreateReviewFindingDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Les constats sont editables uniquement en brouillon');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'finding-order:' + reviewId}))`;
      const aggregate = await tx.reviewFinding.aggregate({ where: { operationalReviewId: reviewId }, _max: { displayOrder: true } });
      const finding = await tx.reviewFinding.create({ data: { ...dto, organizationId: actor.organizationId, operationalReviewId: reviewId, displayOrder: (aggregate._max.displayOrder ?? 0) + 1, createdByType: CoroActorType.CLIENT_USER, createdById: actor.sub } });
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'FINDING_CREATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { findingId: finding.id, category: finding.category } } });
      return finding;
    });
  }

  async updateFinding(reviewId: string, findingId: string, dto: UpdateReviewFindingDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Les constats sont editables uniquement en brouillon');
    await this.assertFinding(reviewId, findingId, actor.organizationId);
    return this.prisma.$transaction(async (tx) => {
      const finding = await tx.reviewFinding.update({ where: { id: findingId }, data: dto });
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'FINDING_UPDATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { findingId, fields: Object.keys(dto) } } });
      return finding;
    });
  }

  async changeFindingStatus(reviewId: string, findingId: string, dto: ChangeReviewFindingStatusDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_REVIEW);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.IN_REVIEW) throw new ConflictException('La decision sur un constat exige un REX en revue');
    const current = await this.assertFinding(reviewId, findingId, actor.organizationId);
    const now = new Date();
    const decided = dto.status === 'ACCEPTED' || dto.status === 'CLOSED';
    return this.prisma.$transaction(async (tx) => {
      const finding = await tx.reviewFinding.update({ where: { id: findingId }, data: { status: dto.status, ...(dto.status === 'ACCEPTED' ? { acceptedAt: now, acceptedByType: CoroActorType.CLIENT_USER, acceptedById: actor.sub } : {}), ...(dto.status === 'CLOSED' ? { closedAt: now, closedByType: CoroActorType.CLIENT_USER, closedById: actor.sub } : {}) } });
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'FINDING_STATUS_CHANGED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { findingId, previousStatus: current.status, newStatus: dto.status, decided } } });
      return finding;
    });
  }

  async deleteFinding(reviewId: string, findingId: string, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Suppression permise uniquement en brouillon');
    await this.assertFinding(reviewId, findingId, actor.organizationId);
    return this.prisma.$transaction(async (tx) => {
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'FINDING_DELETED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { findingId } } });
      await tx.reviewFinding.delete({ where: { id: findingId } });
      return { deleted: true };
    });
  }

  async createRecommendation(reviewId: string, findingId: string, dto: CreateReviewRecommendationDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Les recommandations sont editables uniquement en brouillon');
    await this.assertFinding(reviewId, findingId, actor.organizationId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'recommendation-order:' + reviewId}))`;
      const aggregate = await tx.reviewRecommendation.aggregate({ where: { operationalReviewId: reviewId }, _max: { displayOrder: true } });
      const recommendation = await tx.reviewRecommendation.create({ data: { ...dto, organizationId: actor.organizationId, operationalReviewId: reviewId, reviewFindingId: findingId, displayOrder: (aggregate._max.displayOrder ?? 0) + 1, createdByType: CoroActorType.CLIENT_USER, createdById: actor.sub } });
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'RECOMMENDATION_CREATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { findingId, recommendationId: recommendation.id } } });
      return recommendation;
    });
  }

  async updateRecommendation(reviewId: string, recommendationId: string, dto: UpdateReviewRecommendationDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Les recommandations sont editables uniquement en brouillon');
    await this.assertRecommendation(reviewId, recommendationId, actor.organizationId);
    return this.prisma.$transaction(async (tx) => {
      const recommendation = await tx.reviewRecommendation.update({ where: { id: recommendationId }, data: dto });
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'RECOMMENDATION_UPDATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { recommendationId, fields: Object.keys(dto) } } });
      return recommendation;
    });
  }

  async decideRecommendation(reviewId: string, recommendationId: string, dto: DecideReviewRecommendationDto, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_REVIEW);
    if (dto.status === 'PROPOSED') throw new BadRequestException('PROPOSED est un etat initial, pas une decision');
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.IN_REVIEW) throw new ConflictException('La decision exige un REX en revue');
    const current = await this.assertRecommendation(reviewId, recommendationId, actor.organizationId);
    return this.prisma.$transaction(async (tx) => {
      const recommendation = await tx.reviewRecommendation.update({ where: { id: recommendationId }, data: { status: dto.status, decisionComment: dto.decisionComment, decidedAt: new Date(), decidedByType: CoroActorType.CLIENT_USER, decidedById: actor.sub } });
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'RECOMMENDATION_DECIDED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { recommendationId, previousStatus: current.status, newStatus: dto.status } } });
      return recommendation;
    });
  }

  async deleteRecommendation(reviewId: string, recommendationId: string, actor: ReviewActor) {
    await this.requirePermission(actor, OperationalReviewPermission.REX_EDIT);
    const review = await this.scoped(reviewId, actor);
    if (review.status !== OperationalReviewStatus.DRAFT) throw new ConflictException('Suppression permise uniquement en brouillon');
    await this.assertRecommendation(reviewId, recommendationId, actor.organizationId);
    return this.prisma.$transaction(async (tx) => {
      await tx.operationalReviewAuditEvent.create({ data: { reviewId, type: 'RECOMMENDATION_DELETED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { recommendationId } } });
      await tx.reviewRecommendation.delete({ where: { id: recommendationId } });
      return { deleted: true };
    });
  }

  private async assertFinding(reviewId: string, findingId: string, organizationId: string) {
    const finding = await this.prisma.reviewFinding.findFirst({ where: { id: findingId, operationalReviewId: reviewId, organizationId } });
    if (!finding) throw new NotFoundException('Constat REX introuvable');
    return finding;
  }

  private async assertRecommendation(reviewId: string, recommendationId: string, organizationId: string) {
    const recommendation = await this.prisma.reviewRecommendation.findFirst({ where: { id: recommendationId, operationalReviewId: reviewId, organizationId } });
    if (!recommendation) throw new NotFoundException('Recommandation REX introuvable');
    return recommendation;
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
