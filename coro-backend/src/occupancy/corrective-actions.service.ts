import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCorrectiveActionDto,
  UpdateCorrectiveActionDto,
} from './dto/corrective-action.dto';

export interface CorrectiveActionActor {
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
    return this.prisma.correctiveAction.findMany({
      where: {
        organizationId: actor.organizationId,
        ...this.accessScope(actor, buildingId),
        status: { not: 'CANCELLED' },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(body: CreateCorrectiveActionDto, actor: CorrectiveActionActor) {
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
    return this.prisma.correctiveAction.create({
      data: {
        organizationId: actor.organizationId,
        buildingId: resolvedBuildingId || null,
        incidentId: body.incidentId || null,
        category: body.category || 'GENERAL',
        title: body.title,
        description: body.description || null,
        status: body.status || 'PLANNED',
        priority: body.priority || 'WARNING',
        assignedTo: body.assignedTo || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });
  }

  async update(
    id: string,
    body: UpdateCorrectiveActionDto,
    actor: CorrectiveActionActor,
  ) {
    const action = await this.prisma.correctiveAction.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        ...this.accessScope(actor),
      },
    });
    if (!action) throw new NotFoundException('Action introuvable');

    return this.prisma.correctiveAction.update({
      where: { id },
      data: {
        title: body.title ?? action.title,
        description: body.description ?? action.description,
        status: body.status ?? action.status,
        priority: body.priority ?? action.priority,
        assignedTo: body.assignedTo ?? action.assignedTo,
        dueDate:
          body.dueDate === null
            ? null
            : body.dueDate
              ? new Date(body.dueDate)
              : action.dueDate,
        completedAt:
          body.status === 'COMPLETED' && !action.completedAt
            ? new Date()
            : action.completedAt,
      },
    });
  }

  async delete(id: string, actor: CorrectiveActionActor) {
    const action = await this.prisma.correctiveAction.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        ...this.accessScope(actor),
      },
    });
    if (!action) throw new NotFoundException('Action introuvable');
    return this.prisma.correctiveAction.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
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
