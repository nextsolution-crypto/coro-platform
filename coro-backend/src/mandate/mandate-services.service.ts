import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma, ProjectMandateService } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { projectAccessWhere } from '../auth/project-access';
import type { WorkManagementActor } from '../auth/work-management-access';
import type { MandateServiceLineDto, SaveMandateServicesDto } from './mandate-services.dto';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class MandateServicesService {
  constructor(private readonly prisma: PrismaService) {}

  computeRevision(rows: ProjectMandateService[]) {
    const state = rows.map(row => ({
      id: row.id, activityTypeId: row.activityTypeId, commercialStatus: row.commercialStatus,
      recurrenceMode: row.recurrenceMode, quantity: row.quantity, displayOrder: row.displayOrder,
      nameFRSnapshot: row.nameFRSnapshot, nameENSnapshot: row.nameENSnapshot,
      removedAt: row.removedAt?.toISOString() ?? null,
    })).sort((a, b) => a.id.localeCompare(b.id));
    return createHash('sha256').update(JSON.stringify(state)).digest('hex');
  }

  private async context(db: Db, projectId: string, actor: WorkManagementActor) {
    const project = await db.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true, organizationId: true, mandate: { select: { id: true } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (!project.mandate) throw new BadRequestException("Enregistrez d'abord la fiche du Mandat");
    return { projectId: project.id, organizationId: project.organizationId, projectMandateId: project.mandate.id };
  }

  private async rows(db: Db, context: { projectMandateId: string; projectId: string; organizationId: string }) {
    return db.projectMandateService.findMany({
      where: context,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  private response(rows: ProjectMandateService[]) {
    return { revision: this.computeRevision(rows), services: rows.map(({ createdById, updatedById, removedById, organizationId, projectId, ...row }) => row) };
  }

  async list(projectId: string, actor: WorkManagementActor) {
    const context = await this.context(this.prisma, projectId, actor);
    return this.response(await this.rows(this.prisma, context));
  }

  async save(projectId: string, actor: WorkManagementActor, dto: SaveMandateServicesDto) {
    const ids = dto.services.flatMap(line => line.id ? [line.id] : []);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Un service ne peut apparaître qu’une fois');
    const desired = dto.services.map((line, index) => ({ ...line, displayOrder: index }));

    return this.prisma.$transaction(async tx => {
      const context = await this.context(tx, projectId, actor);
      await tx.$queryRaw`SELECT "id" FROM "ProjectMandate" WHERE "id" = ${context.projectMandateId} FOR UPDATE`;
      const beforeRows = await this.rows(tx, context);
      const byId = new Map(beforeRows.map(row => [row.id, row]));
      for (const id of ids) if (!byId.has(id)) throw new BadRequestException('Service commercial introuvable');

      const claimed = new Set<string>();
      const resolved: Array<{ input: MandateServiceLineDto; existing?: ProjectMandateService }> = [];
      for (const input of desired) {
        let existing = input.id ? byId.get(input.id) : undefined;
        if (!existing) existing = beforeRows.find(row => !claimed.has(row.id) && row.commercialStatus === 'ACTIVE'
          && row.activityTypeId === input.activityTypeId && row.recurrenceMode === input.recurrenceMode
          && row.quantity === input.quantity && row.displayOrder === input.displayOrder);
        if (existing) {
          claimed.add(existing.id);
          if (existing.activityTypeId !== input.activityTypeId) throw new BadRequestException("Le type d'une ligne commerciale est immuable");
        }
        resolved.push({ input, existing });
      }

      const requiresActiveType = resolved.filter(item => !item.existing || item.existing.commercialStatus === 'REMOVED');
      const typeIds = [...new Set(requiresActiveType.map(item => item.input.activityTypeId))];
      let types: Array<{ id: string; nameFR: string; nameEN: string | null }> = [];
      if (typeIds.length) {
        types = await tx.activityType.findMany({ where: {
          id: { in: typeIds }, isActive: true,
          OR: [{ organizationId: null }, { organizationId: actor.organizationId }],
        } });
        if (types.length !== typeIds.length) throw new BadRequestException("Type d'activité indisponible");
      }
      const typeById = new Map(types.map(type => [type.id, type]));

      const removals = beforeRows.filter(row => row.commercialStatus === 'ACTIVE' && !claimed.has(row.id));
      const changes = resolved.some(({ input, existing }) => !existing || existing.commercialStatus !== 'ACTIVE'
        || existing.recurrenceMode !== input.recurrenceMode || existing.quantity !== input.quantity
        || existing.displayOrder !== input.displayOrder) || removals.length > 0;
      if (!changes) return this.response(beforeRows);
      if (dto.expectedRevision !== this.computeRevision(beforeRows)) {
        throw new ConflictException('La configuration commerciale a été modifiée; rechargez le Mandat');
      }

      const now = new Date();
      for (const row of removals) {
        await tx.projectMandateService.update({ where: { id: row.id }, data: {
          commercialStatus: 'REMOVED', removedAt: now, removedById: actor.userId, updatedById: actor.userId,
        } });
        await this.audit(tx, actor, context, row.id, 'MANDATE_SERVICE_REMOVED', row.activityTypeId,
          { commercialStatus: row.commercialStatus }, { commercialStatus: 'REMOVED' });
      }
      for (const { input, existing } of resolved) {
        if (!existing) {
          const type = typeById.get(input.activityTypeId)!;
          const id = randomUUID();
          await tx.projectMandateService.create({ data: { id, ...context, activityTypeId: type.id,
            recurrenceMode: input.recurrenceMode, quantity: input.quantity, displayOrder: input.displayOrder,
            nameFRSnapshot: type.nameFR, nameENSnapshot: type.nameEN,
            createdById: actor.userId, updatedById: actor.userId } });
          await this.audit(tx, actor, context, id, 'MANDATE_SERVICE_ADDED', type.id, null,
            { recurrenceMode: input.recurrenceMode, quantity: input.quantity, displayOrder: input.displayOrder });
          continue;
        }
        const restored = existing.commercialStatus === 'REMOVED';
        const changed = restored || existing.recurrenceMode !== input.recurrenceMode
          || existing.quantity !== input.quantity || existing.displayOrder !== input.displayOrder;
        if (!changed) continue;
        await tx.projectMandateService.update({ where: { id: existing.id }, data: {
          commercialStatus: 'ACTIVE', removedAt: null, removedById: null,
          recurrenceMode: input.recurrenceMode, quantity: input.quantity,
          displayOrder: input.displayOrder, updatedById: actor.userId,
        } });
        await this.audit(tx, actor, context, existing.id, restored ? 'MANDATE_SERVICE_RESTORED' : 'MANDATE_SERVICE_UPDATED',
          existing.activityTypeId,
          { recurrenceMode: existing.recurrenceMode, quantity: existing.quantity, displayOrder: existing.displayOrder,
            commercialStatus: existing.commercialStatus },
          { recurrenceMode: input.recurrenceMode, quantity: input.quantity, displayOrder: input.displayOrder,
            commercialStatus: 'ACTIVE' });
      }
      return this.response(await this.rows(tx, context));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async audit(tx: Prisma.TransactionClient, actor: WorkManagementActor,
    context: { projectMandateId: string; projectId: string; organizationId: string },
    mandateServiceId: string, action: string, activityTypeId: string, before: unknown, after: unknown) {
    await tx.auditLog.create({ data: {
      action, entityType: 'ProjectMandateService', entityId: mandateServiceId,
      projectId: context.projectId, organizationId: context.organizationId, userId: actor.userId,
      description: action, metadata: { mandateServiceId, projectMandateId: context.projectMandateId,
        activityTypeId, before, after } as Prisma.InputJsonValue,
    } });
  }
}
