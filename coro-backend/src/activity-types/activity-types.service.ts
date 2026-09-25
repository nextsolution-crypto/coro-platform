import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor } from '../auth/project-access';
import { Prisma } from '@prisma/client';
import { ActivityTypeInputDto } from './activity-types.dto';

@Injectable()
export class ActivityTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertReader(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(actor.role)) throw new ForbiddenException('Accès refusé au catalogue');
  }
  private assertAdmin(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new ForbiddenException('Accès réservé aux administrateurs');
  }
  private assertConfigurationAdmin(actor: AdviserActor, scope: 'global' | 'tenant') {
    if (scope === 'global') {
      if (actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Configuration CORO réservée au super administrateur');
      return;
    }
    this.assertAdmin(actor);
  }
  private scope(actor: AdviserActor) { return { OR: [{ organizationId: null }, { organizationId: actor.organizationId }] }; }

  async list(actor: AdviserActor, includeArchived = false) {
    this.assertReader(actor);
    if (includeArchived) this.assertAdmin(actor);
    return this.prisma.activityType.findMany({
      where: { ...this.scope(actor), ...(includeArchived ? {} : { isActive: true }) },
      orderBy: [{ displayOrder: 'asc' }, { nameFR: 'asc' }, { id: 'asc' }],
    });
  }

  async get(id: string, actor: AdviserActor, allowArchived = true) {
    this.assertReader(actor);
    const item = await this.prisma.activityType.findFirst({ where: { id, ...this.scope(actor), ...(allowArchived ? {} : { isActive: true }) } });
    if (!item) throw new NotFoundException("Type d'activité introuvable");
    return item;
  }

  async create(dto: ActivityTypeInputDto, actor: AdviserActor) {
    this.assertAdmin(actor);
    const nameFR = dto.nameFR.trim();
    if (!nameFR) throw new BadRequestException('Le nom français est obligatoire');
    const last = await this.prisma.activityType.findFirst({ where: { organizationId: actor.organizationId }, orderBy: [{ displayOrder: 'desc' }] });
    const slug = nameFR.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'type';
    return this.prisma.activityType.create({ data: {
      organizationId: actor.organizationId, code: `custom-${slug}-${randomUUID().slice(0, 8)}`,
      nameFR, nameEN: dto.nameEN?.trim() || null, descriptionFR: dto.descriptionFR?.trim() || null,
      descriptionEN: dto.descriptionEN?.trim() || null, visualToken: dto.visualToken, iconKey: dto.iconKey ?? null,
      defaultDurationMinutes: dto.defaultDurationMinutes ?? null, clientBookableDefault: dto.clientBookableDefault,
      displayOrder: dto.displayOrder ?? Math.min((last?.displayOrder ?? 0) + 10, 100000), isSystem: false,
    } });
  }

  private async custom(id: string, actor: AdviserActor) {
    this.assertAdmin(actor);
    const item = await this.prisma.activityType.findFirst({ where: { id, ...this.scope(actor) } });
    if (!item) throw new NotFoundException("Type d'activité introuvable");
    if (item.isSystem) throw new ForbiddenException('Un type CORO ne peut pas être modifié');
    if (item.organizationId !== actor.organizationId) throw new NotFoundException("Type d'activité introuvable");
    return item;
  }

  async update(id: string, dto: ActivityTypeInputDto, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: {
      nameFR: dto.nameFR.trim(), nameEN: dto.nameEN?.trim() || null, descriptionFR: dto.descriptionFR?.trim() || null,
      descriptionEN: dto.descriptionEN?.trim() || null, visualToken: dto.visualToken, iconKey: dto.iconKey ?? null,
      defaultDurationMinutes: dto.defaultDurationMinutes ?? null, clientBookableDefault: dto.clientBookableDefault,
      ...(dto.displayOrder === undefined ? {} : { displayOrder: dto.displayOrder }),
    } });
  }
  async reorder(id: string, displayOrder: number, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: { displayOrder } });
  }
  async archive(id: string, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
  }
  async restore(id: string, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: { isActive: true, archivedAt: null } });
  }
  async remove(id: string, actor: AdviserActor) {
    await this.custom(id, actor);
    const used = await this.prisma.projectActivity.count({ where: { activityTypeId: id } });
    if (used) throw new BadRequestException("Ce type est utilisé; archivez-le pour préserver l'historique");
    try {
      return await this.prisma.activityType.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException("Ce type vient d'être utilisé; archivez-le pour préserver l'historique");
      }
      throw error;
    }
  }

  async getTaskListConfiguration(id: string, actor: AdviserActor) {
    this.assertReader(actor);
    const activityType = await this.get(id, actor, true);
    const policies = await this.prisma.activityTypeTaskListPolicy.findMany({
      where: { activityTypeId: id, OR: [{ organizationId: null }, { organizationId: actor.organizationId }] },
      include: { associations: { include: { taskList: true }, orderBy: [{ displayOrder: 'asc' }, { taskListId: 'asc' }] } },
    });
    const global = policies.find((policy) => policy.organizationId === null) ?? null;
    const tenant = policies.find((policy) => policy.organizationId === actor.organizationId) ?? null;
    return {
      activityType,
      global: global ? this.policyView(global) : null,
      tenant: tenant ? this.policyView(tenant) : { mode: 'INHERIT', taskLists: [] },
      resolved: await this.resolveTaskLists({ activityTypeId: id, organizationId: actor.organizationId }),
    };
  }

  async resolveTaskLists(input: { activityTypeId: string; organizationId: string; documentType?: string }, db: any = this.prisma) {
    const activityType = await db.activityType.findFirst({ where: {
      id: input.activityTypeId, isActive: true,
      OR: [{ organizationId: null }, { organizationId: input.organizationId }],
    } });
    if (!activityType) throw new NotFoundException("Type d'activité introuvable");
    const policies = await db.activityTypeTaskListPolicy.findMany({
      where: { activityTypeId: activityType.id, OR: [{ organizationId: null }, { organizationId: input.organizationId }] },
      include: { associations: { where: { isActive: true, taskList: { isActive: true } }, include: { taskList: true },
        orderBy: [{ displayOrder: 'asc' }, { taskList: { name: 'asc' } }, { taskListId: 'asc' }] } },
    });
    const acceptsDocument = (list: { documentTypes: string[] }) => !input.documentType ||
      list.documentTypes.length === 0 || list.documentTypes.includes(input.documentType);
    const global = policies.find((policy) => policy.organizationId === null);
    const tenant = policies.find((policy) => policy.organizationId === input.organizationId);
    const items = (policy: any, source: 'GLOBAL' | 'TENANT') => (policy?.associations ?? [])
      .filter((association: any) => acceptsDocument(association.taskList))
      .map((association: any) => ({ ...association.taskList, source, displayOrder: association.displayOrder,
        sourceActivityTypeTaskListId: association.id }));
    const globalItems = items(global, 'GLOBAL');
    if (!tenant) return globalItems;
    if (tenant.mode === 'DISABLE') return [];
    const tenantItems = items(tenant, 'TENANT');
    if (tenant.mode === 'REPLACE') return tenantItems;
    const tenantIds = new Set(tenantItems.map((item: any) => item.id));
    return [...globalItems.filter((item: any) => !tenantIds.has(item.id)), ...tenantItems];
  }

  async resolveTaskListsForActor(activityTypeId: string, documentType: string | undefined, actor: AdviserActor) {
    this.assertReader(actor);
    return this.resolveTaskLists({ activityTypeId, organizationId: actor.organizationId, documentType });
  }

  async updateTaskListConfiguration(id: string, dto: {
    scope: 'global' | 'tenant'; mode: 'INHERIT' | 'APPEND' | 'REPLACE' | 'DISABLE';
    taskLists?: Array<{ taskListId: string; displayOrder?: number }>;
  }, actor: AdviserActor) {
    this.assertConfigurationAdmin(actor, dto.scope);
    const organizationId = dto.scope === 'global' ? null : actor.organizationId;
    if (dto.scope === 'global' && dto.mode !== 'REPLACE') throw new BadRequestException('La configuration CORO utilise le mode REPLACE');
    if (dto.scope === 'tenant' && dto.mode === 'INHERIT' && (dto.taskLists?.length ?? 0) > 0) {
      throw new BadRequestException('INHERIT ne contient aucune liste');
    }
    if (dto.mode === 'DISABLE' && (dto.taskLists?.length ?? 0) > 0) throw new BadRequestException('DISABLE ne contient aucune liste');
    const requested = dto.taskLists ?? [];
    if (!['INHERIT', 'DISABLE'].includes(dto.mode) && requested.length === 0) {
      throw new BadRequestException('Sélectionnez au moins une liste de tâches');
    }
    const uniqueIds = [...new Set(requested.map((item) => item.taskListId))];
    if (uniqueIds.length !== requested.length) throw new BadRequestException('Une liste de tâches ne peut être associée deux fois');

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ActivityType" WHERE "id" = ${id} FOR UPDATE`;
      const activityType = await tx.activityType.findFirst({ where: {
        id, ...(dto.scope === 'global'
          ? { organizationId: null, isSystem: true }
          : { OR: [{ organizationId: null }, { organizationId: actor.organizationId }] }),
      } });
      if (!activityType) throw new NotFoundException("Type d'activité introuvable");
      const lists = uniqueIds.length ? await tx.taskList.findMany({ where: {
        id: { in: uniqueIds }, isActive: true,
        ...(dto.scope === 'global' ? { organizationId: null } : { OR: [{ organizationId: null }, { organizationId: actor.organizationId }] }),
      } }) : [];
      if (lists.length !== uniqueIds.length) throw new NotFoundException('Liste de tâches introuvable');
      const before = await tx.activityTypeTaskListPolicy.findFirst({
        where: { activityTypeId: id, organizationId }, include: { associations: true },
      });
      if (dto.mode === 'INHERIT') {
        if (before) await tx.activityTypeTaskListPolicy.delete({ where: { id: before.id } });
      } else {
        const policy = before
          ? await tx.activityTypeTaskListPolicy.update({ where: { id: before.id }, data: { mode: dto.mode as any } })
          : await tx.activityTypeTaskListPolicy.create({ data: { activityTypeId: id, organizationId, mode: dto.mode as any } });
        await tx.activityTypeTaskList.deleteMany({ where: { policyId: policy.id } });
        if (requested.length) await tx.activityTypeTaskList.createMany({ data: requested.map((item, index) => ({
          policyId: policy.id, taskListId: item.taskListId,
          displayOrder: item.displayOrder ?? (index + 1) * 10,
        })) });
      }
      await tx.auditLog.create({ data: {
        action: 'ACTIVITY_TYPE_TASK_LIST_CONFIG_UPDATED', entityType: 'ActivityType', entityId: id,
        description: 'Configuration des listes de tâches mise à jour.',
        metadata: { scope: dto.scope, before: before ? { mode: before.mode,
          taskListIds: before.associations.map((item) => item.taskListId) } : { mode: 'INHERIT', taskListIds: [] },
          after: { mode: dto.mode, taskListIds: uniqueIds } },
        userId: actor.userId, organizationId: actor.organizationId,
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    return this.getTaskListConfiguration(id, actor);
  }

  private policyView(policy: any) {
    return { mode: policy.mode, taskLists: policy.associations.map((association: any) => ({
      ...association.taskList, displayOrder: association.displayOrder, isActive: association.isActive,
    })) };
  }
}
