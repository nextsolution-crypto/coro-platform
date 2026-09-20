import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoroActorType, CorrectiveActionAssigneeType, CorrectiveActionPermission, OperationalReviewConfidentiality, OperationalReviewPermission, Prisma } from '@prisma/client';
import {
  CreateCorrectiveActionDto,
  UpdateCorrectiveActionDto,
} from './dto/corrective-action.dto';

export interface CorrectiveActionActor {
  sub?: string;
  organizationId: string;
  role: string;
  clientId?: string;
  buildingIds?: string[];
}

@Injectable()
export class CorrectiveActionsService {
  constructor(private prisma: PrismaService) {}

  async getAll(actor: CorrectiveActionActor, buildingId?: string) {
    if (buildingId) this.assertBuildingAccess(actor, buildingId);
    const visibilityScope = await this.visibilityScope(actor);
    const actions = await this.prisma.correctiveAction.findMany({
      where: {
        organizationId: actor.organizationId,
        ...this.accessScope(actor, buildingId),
        ...visibilityScope,
        status: { not: 'CANCELLED' },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { reviewRecommendation: { select: { operationalReview: { select: { confidentiality: true } } } } },
    });
    return actions.map((action) => this.safeAction(action, actor));
  }

  async create(body: CreateCorrectiveActionDto, actor: CorrectiveActionActor) {
    await this.requirePermission(actor, CorrectiveActionPermission.CORRECTIVE_ACTION_CREATE);
    if (body.buildingId) this.assertBuildingAccess(actor, body.buildingId);
    if (body.buildingId) {
      const building = await this.prisma.building.findFirst({
        where: {
          id: body.buildingId,
          organizationId: actor.organizationId,
          ...this.clientScope(actor),
        },
        select: { id: true },
      });
      if (!building)
        throw new BadRequestException(
          'Batiment invalide pour cette organisation',
        );
    }
    let incidentBuildingId: string | undefined;
    if (body.incidentId) {
      const incident = await this.prisma.incidentEvent.findFirst({
        where: {
          id: body.incidentId,
          organizationId: actor.organizationId,
          building: { is: this.clientScope(actor) },
        },
        select: { id: true, buildingId: true },
      });
      if (!incident)
        throw new BadRequestException(
          'Incident invalide pour cette organisation',
        );
      this.assertBuildingAccess(actor, incident.buildingId);
      incidentBuildingId = incident.buildingId;
      if (body.buildingId && incident.buildingId !== body.buildingId) {
        throw new BadRequestException(
          "L'incident n'appartient pas au batiment indique",
        );
      }
    }
    const resolvedBuildingId = body.buildingId || incidentBuildingId;
    if (this.isClientActor(actor) && !resolvedBuildingId) {
      throw new ForbiddenException(
        'Une action du portail doit etre associee a un batiment accessible',
      );
    }
    this.assertBuildingAccess(actor, resolvedBuildingId);
    const assignee = await this.resolveAssignee(body, actor);
    if (body.visibility === OperationalReviewConfidentiality.ADVISOR && this.isClientActor(actor)) throw new ForbiddenException('Visibilite ADVISOR reservee au canal conseiller');
    return this.prisma.$transaction(async (tx) => {
      if (body.clientIntentId) {
        const replay = await tx.correctiveAction.findFirst({ where: { clientIntentId: body.clientIntentId, organizationId: actor.organizationId } });
        if (replay) return this.safeAction(replay, actor);
      }
      const action = await tx.correctiveAction.create({ data: {
        organizationId: actor.organizationId,
        buildingId: resolvedBuildingId || null,
        incidentId: body.incidentId || null,
        category: body.category || 'GENERAL',
        title: body.title,
        description: body.description || null,
        status: body.status || 'PLANNED',
        completedAt: body.status === 'COMPLETED' ? new Date() : null,
        priority: body.priority || 'WARNING',
        assignedTo: body.assignedTo || null,
        ...assignee,
        visibility: body.visibility || OperationalReviewConfidentiality.BUILDING_TEAM,
        clientIntentId: body.clientIntentId,
        createdByType: actor.sub ? CoroActorType.CLIENT_USER : null,
        createdById: actor.sub || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      } });
      if (actor.sub) await tx.correctiveActionAuditEvent.create({ data: { organizationId: actor.organizationId, correctiveActionId: action.id, eventType: 'CREATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { status: action.status, category: action.category } } });
      return this.safeAction(action, actor);
    });
  }

  async createFromRecommendation(reviewId: string, recommendationId: string, body: CreateCorrectiveActionDto, actor: CorrectiveActionActor) {
    await this.requirePermission(actor, CorrectiveActionPermission.CORRECTIVE_ACTION_CREATE);
    if (!body.clientIntentId) throw new BadRequestException('clientIntentId requis');
    const recommendation = await this.prisma.reviewRecommendation.findFirst({
      where: { id: recommendationId, operationalReviewId: reviewId, organizationId: actor.organizationId, status: 'ACCEPTED' },
      select: { id: true, operationalReview: { select: { buildingId: true, confidentiality: true } } },
    });
    if (!recommendation) throw new BadRequestException('Recommandation acceptee introuvable');
    const buildingId = recommendation.operationalReview.buildingId;
    if (!buildingId) throw new BadRequestException('Le REX source doit etre associe a un batiment');
    if (body.buildingId && body.buildingId !== buildingId) throw new BadRequestException('Batiment incoherent avec le REX source');
    this.assertBuildingAccess(actor, buildingId);
    await this.assertReviewSourceAccess(actor, recommendation.operationalReview.confidentiality);
    const assignee = await this.resolveAssignee(body, actor);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'corrective-intent:' + body.clientIntentId}))`;
      const replay = await tx.correctiveAction.findFirst({ where: { clientIntentId: body.clientIntentId, organizationId: actor.organizationId } });
      if (replay) return this.safeAction(replay, actor);
      const action = await tx.correctiveAction.create({ data: {
        organizationId: actor.organizationId, buildingId, reviewRecommendationId: recommendation.id,
        clientIntentId: body.clientIntentId, visibility: recommendation.operationalReview.confidentiality,
        category: body.category || 'GENERAL', title: body.title, description: body.description || null,
        status: 'PLANNED', priority: body.priority || 'WARNING', assignedTo: body.assignedTo || null,
        ...assignee, dueDate: body.dueDate ? new Date(body.dueDate) : null,
        createdByType: actor.sub ? CoroActorType.CLIENT_USER : null, createdById: actor.sub || null,
      } });
      if (actor.sub) await tx.correctiveActionAuditEvent.createMany({ data: [
        { organizationId: actor.organizationId, correctiveActionId: action.id, eventType: 'CREATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { status: 'PLANNED', category: action.category } },
        { organizationId: actor.organizationId, correctiveActionId: action.id, eventType: 'SOURCE_LINKED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { recommendationId } },
      ] });
      return this.safeAction(action, actor);
    });
  }

  async update(
    id: string,
    body: UpdateCorrectiveActionDto,
    actor: CorrectiveActionActor,
  ) {
    const permission = body.status === 'COMPLETED' || body.status === 'IN_PROGRESS'
      ? CorrectiveActionPermission.CORRECTIVE_ACTION_COMPLETE
      : CorrectiveActionPermission.CORRECTIVE_ACTION_EDIT;
    await this.requirePermission(actor, permission);
    const visibilityScope = await this.visibilityScope(actor);
    const action = await this.prisma.correctiveAction.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        ...this.accessScope(actor),
        ...visibilityScope,
      },
    });
    if (!action) throw new NotFoundException('Action introuvable');

    if (body.status) this.assertTransition(action.status, body.status);
    const assignee = await this.resolveAssignee(body, actor, true);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.correctiveAction.update({ where: { id }, data: {
        title: body.title ?? action.title,
        description: body.description ?? action.description,
        status: body.status ?? action.status,
        priority: body.priority ?? action.priority,
        assignedTo: body.assignedTo ?? action.assignedTo,
        ...assignee,
        updatedByType: actor.sub ? CoroActorType.CLIENT_USER : action.updatedByType,
        updatedById: actor.sub || action.updatedById,
        dueDate:
          body.dueDate === null
            ? null
            : body.dueDate
              ? new Date(body.dueDate)
              : action.dueDate,
        completedAt: body.status === 'COMPLETED' ? (action.completedAt || new Date()) : action.status === 'COMPLETED' && body.status === 'IN_PROGRESS' ? null : action.completedAt,
      } });
      if (actor.sub) {
        const statusChanged = body.status && body.status !== action.status;
        const assigned = assignee.assigneeType !== undefined || body.assignedTo !== undefined;
        await tx.correctiveActionAuditEvent.create({ data: { organizationId: actor.organizationId, correctiveActionId: id, eventType: statusChanged ? 'STATUS_CHANGED' : assigned ? 'ASSIGNED' : 'UPDATED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: statusChanged ? { previousStatus: action.status, newStatus: body.status } : { fields: Object.keys(body).filter((key) => key !== 'externalAssigneeDisplayName') } } });
      }
      return this.safeAction(updated, actor);
    });
  }

  async delete(id: string, actor: CorrectiveActionActor) {
    await this.requirePermission(actor, CorrectiveActionPermission.CORRECTIVE_ACTION_EDIT);
    const visibilityScope = await this.visibilityScope(actor);
    const action = await this.prisma.correctiveAction.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        ...this.accessScope(actor),
        ...visibilityScope,
      },
    });
    if (!action) throw new NotFoundException('Action introuvable');
    this.assertTransition(action.status, 'CANCELLED');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.correctiveAction.update({ where: { id }, data: { status: 'CANCELLED', updatedByType: actor.sub ? CoroActorType.CLIENT_USER : action.updatedByType, updatedById: actor.sub || action.updatedById } });
      if (actor.sub) await tx.correctiveActionAuditEvent.create({ data: { organizationId: actor.organizationId, correctiveActionId: id, eventType: 'CANCELLED', actorType: CoroActorType.CLIENT_USER, actorId: actor.sub, metadata: { previousStatus: action.status } } });
      return this.safeAction(updated, actor);
    });
  }

  private assertTransition(current: string, next: string) {
    if (['VERIFIED', 'CLOSED'].includes(next)) throw new BadRequestException('Statut reserve a une phase ulterieure');
    if (current === next) return;
    const allowed: Record<string, string[]> = { PLANNED: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'CANCELLED'], COMPLETED: ['IN_PROGRESS'], CANCELLED: [] };
    if (!(allowed[current] || []).includes(next)) throw new BadRequestException(`Transition ${current} vers ${next} interdite`);
  }

  private async requirePermission(actor: CorrectiveActionActor, permission: CorrectiveActionPermission) {
    if (!actor.sub) return;
    const user = await this.prisma.clientUser.findFirst({ where: { id: actor.sub, organizationId: actor.organizationId, isActive: true }, select: { correctiveActionPermissions: true } });
    if (!user) throw new ForbiddenException('Utilisateur client invalide');
    if (user.correctiveActionPermissions.length > 0 && !user.correctiveActionPermissions.includes(permission)) throw new ForbiddenException('Permission action corrective requise');
  }

  private async assertReviewSourceAccess(actor: CorrectiveActionActor, confidentiality: OperationalReviewConfidentiality) {
    if (confidentiality === OperationalReviewConfidentiality.ADVISOR) throw new ForbiddenException('Source reservee au canal conseiller');
    if (confidentiality !== OperationalReviewConfidentiality.RESTRICTED || !actor.sub) return;
    const user = await this.prisma.clientUser.findFirst({ where: { id: actor.sub, organizationId: actor.organizationId, isActive: true }, select: { operationalReviewPermissions: true } });
    const allowedPermissions: OperationalReviewPermission[] = [OperationalReviewPermission.REX_EDIT, OperationalReviewPermission.REX_REVIEW, OperationalReviewPermission.REX_FINALIZE];
    const allowed = user?.operationalReviewPermissions.some((permission) => allowedPermissions.includes(permission));
    if (!allowed) throw new ForbiddenException('Acces refuse a la source REX restreinte');
  }

  private async resolveAssignee(body: { assigneeType?: CorrectiveActionAssigneeType; assigneeId?: string; externalAssigneeDisplayName?: string }, actor: CorrectiveActionActor, partial = false) {
    if (!body.assigneeType) return {};
    if (body.assigneeType === CorrectiveActionAssigneeType.EXTERNAL) {
      if (!body.externalAssigneeDisplayName?.trim()) throw new BadRequestException('Nom du responsable externe requis');
      return { assigneeType: body.assigneeType, assigneeId: null, assigneeDisplayNameSnapshot: body.externalAssigneeDisplayName.trim(), assignedTo: body.externalAssigneeDisplayName.trim() };
    }
    if (!body.assigneeId) throw new BadRequestException('Identifiant du responsable requis');
    const user = body.assigneeType === CorrectiveActionAssigneeType.CLIENT_USER
      ? await this.prisma.clientUser.findFirst({ where: { id: body.assigneeId, organizationId: actor.organizationId, isActive: true }, select: { id: true, firstName: true, lastName: true } })
      : await this.prisma.user.findFirst({ where: { id: body.assigneeId, organizationId: actor.organizationId, isActive: true }, select: { id: true, firstName: true, lastName: true } });
    if (!user) throw new BadRequestException('Responsable invalide');
    const snapshot = `${user.firstName} ${user.lastName}`.trim();
    return { assigneeType: body.assigneeType, assigneeId: user.id, assigneeDisplayNameSnapshot: snapshot, assignedTo: snapshot };
  }

  private safeAction(action: any, actor: CorrectiveActionActor) {
    const { clientIntentId, reviewRecommendation, ...safe } = action;
    const reviewConfidentiality = reviewRecommendation?.operationalReview?.confidentiality;
    const sourceRestricted = Boolean(action.reviewRecommendationId && reviewConfidentiality === OperationalReviewConfidentiality.RESTRICTED);
    return { ...safe, reviewRecommendationId: sourceRestricted ? null : action.reviewRecommendationId ?? null, sourceRestricted, sourceAvailable: Boolean(action.reviewRecommendationId && !sourceRestricted) };
  }

  private async visibilityScope(actor: CorrectiveActionActor): Promise<Prisma.CorrectiveActionWhereInput> {
    if (!this.isClientActor(actor)) return {};
    const visible: Prisma.CorrectiveActionWhereInput[] = [
      { visibility: { in: [OperationalReviewConfidentiality.BUILDING_TEAM, OperationalReviewConfidentiality.ORGANIZATION] } },
    ];
    if (actor.sub) {
      visible.push({ visibility: OperationalReviewConfidentiality.RESTRICTED, createdById: actor.sub });
      const user = await this.prisma.clientUser.findFirst({ where: { id: actor.sub, organizationId: actor.organizationId, isActive: true }, select: { operationalReviewPermissions: true } });
      const reviewPermissions: OperationalReviewPermission[] = [OperationalReviewPermission.REX_EDIT, OperationalReviewPermission.REX_REVIEW, OperationalReviewPermission.REX_FINALIZE];
      if (user?.operationalReviewPermissions?.some((permission) => reviewPermissions.includes(permission))) visible.push({ visibility: OperationalReviewConfidentiality.RESTRICTED });
    }
    return { OR: visible };
  }

  private isBuildingLimited(actor: CorrectiveActionActor) {
    return actor.role === 'CLIENT_MANAGER';
  }

  private isClientActor(actor: CorrectiveActionActor) {
    return actor.role === 'CLIENT_MANAGER' || actor.role === 'CLIENT_CORPORATE';
  }

  private clientScope(actor: CorrectiveActionActor): Prisma.BuildingWhereInput {
    if (!this.isClientActor(actor)) return {};
    if (!actor.clientId) throw new ForbiddenException('Client invalide');
    return { clientId: actor.clientId };
  }

  private assertBuildingAccess(
    actor: CorrectiveActionActor,
    buildingId?: string,
  ) {
    if (!this.isBuildingLimited(actor)) return;
    if (!buildingId || !(actor.buildingIds || []).includes(buildingId)) {
      throw new ForbiddenException('Acces refuse a ce batiment');
    }
  }

  private accessScope(
    actor: CorrectiveActionActor,
    buildingId?: string,
  ): Prisma.CorrectiveActionWhereInput {
    if (this.isBuildingLimited(actor)) {
      return {
        buildingId: buildingId || { in: actor.buildingIds || [] },
        building: { is: this.clientScope(actor) },
      };
    }
    if (actor.role === 'CLIENT_CORPORATE') {
      return {
        ...(buildingId ? { buildingId } : {}),
        building: { is: this.clientScope(actor) },
      };
    }
    return buildingId ? { buildingId } : {};
  }
}
