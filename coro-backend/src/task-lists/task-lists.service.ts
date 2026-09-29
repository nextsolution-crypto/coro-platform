import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

@Injectable()
export class TaskListsService {
  constructor(private prisma: PrismaService, @Optional() private adminAudit?: AdminAuditService) {}

  private get audit(): AdminAuditService {
    if (!this.adminAudit) throw new Error('AdminAuditService is required for global task-list mutations.');
    return this.adminAudit;
  }

  // Toutes les listes disponibles (globales + organisation)
  async getAll(organizationId: string) {
    return this.prisma.taskList.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: null },
          { organizationId },
        ],
      },
      include: {
        templates: {
          where: { isActive: true },
          orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
        },
        _count: { select: { templates: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Listes globales seulement (SuperAdmin)
  async getAllGlobal() {
    return this.prisma.taskList.findMany({
      where: { isActive: true, organizationId: null },
      include: {
        templates: {
          where: { isActive: true },
          orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
        },
        _count: { select: { templates: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Créer une liste
  async create(dto: any, organizationId?: string | null) {
    return this.prisma.taskList.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        category: dto.category || 'DOCUMENT',
        documentTypes: dto.documentTypes || [],
        organizationId: organizationId || null,
        isDefault: false,
      },
    });
  }

  async createGlobal(dto: any, actor: any) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.taskList.create({
        data: { name: dto.name, description: dto.description || null, category: dto.category || 'DOCUMENT', documentTypes: dto.documentTypes || [], organizationId: null, isDefault: false },
      });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_LIST_CREATED', targetType: 'TaskList', targetId: created.id, targetLabel: created.name, afterData: { name: created.name, category: created.category } });
      return created;
    });
  }

  async updateGlobal(id: string, dto: any, actor: any) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.taskList.findFirst({ where: { id, organizationId: null } });
      if (!current) throw new NotFoundException('Liste globale introuvable');
      const updated = await tx.taskList.update({ where: { id }, data: { name: dto.name ?? current.name, description: dto.description ?? current.description, category: dto.category ?? current.category, documentTypes: dto.documentTypes ?? current.documentTypes } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_LIST_UPDATED', targetType: 'TaskList', targetId: id, targetLabel: updated.name, beforeData: { name: current.name, category: current.category }, afterData: { name: updated.name, category: updated.category } });
      return updated;
    });
  }

  async deleteGlobal(id: string, actor: any) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.taskList.findFirst({ where: { id, organizationId: null } });
      if (!current) throw new NotFoundException('Liste globale introuvable');
      const updated = await tx.taskList.update({ where: { id }, data: { isActive: false } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_LIST_DISABLED', targetType: 'TaskList', targetId: id, targetLabel: current.name, beforeData: { active: current.isActive }, afterData: { active: false } });
      return updated;
    });
  }

  // Mettre à jour une liste
  async update(id: string, dto: any, organizationId: string | null) {
    const list = await this.prisma.taskList.findFirst({ where: { id, organizationId } });
    if (!list) throw new NotFoundException('Liste introuvable');
    return this.prisma.taskList.update({
      where: { id },
      data: {
        name: dto.name ?? list.name,
        description: dto.description ?? list.description,
        category: dto.category ?? list.category,
        documentTypes: dto.documentTypes ?? list.documentTypes,
      },
    });
  }

  // Supprimer une liste
  async delete(id: string, organizationId: string | null) {
    const list = await this.prisma.taskList.findFirst({ where: { id, organizationId } });
    if (!list) throw new NotFoundException('Liste introuvable');
    return this.prisma.taskList.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Ajouter un template à une liste
  async addTemplate(listId: string, dto: any, organizationId: string) {
    const list = await this.prisma.taskList.findFirst({ where: { id: listId, organizationId } });
    if (!list) throw new NotFoundException('Liste introuvable');

    const count = await this.prisma.taskTemplate.count({ where: { taskListId: listId } });

    return this.prisma.taskTemplate.create({
      data: {
        taskListId: listId,
        categoryName: dto.categoryName,
        taskTitle: dto.taskTitle,
        documentTypes: [],
        order: dto.order ?? count + 1,
        organizationId: list.organizationId,
      },
    });
  }

  // Importer une liste dans un projet (crée une copie indépendante)
  async importToProject(listId: string, projectId: string, customName: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundException('Projet introuvable');
    const list = await this.prisma.taskList.findFirst({
      where: { id: listId, OR: [{ organizationId: null }, { organizationId }] },
      include: {
        templates: {
          where: { isActive: true },
          orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
        },
      },
    });
    if (!list) throw new NotFoundException('Liste introuvable');

    // Créer l'instance de la liste dans le projet
    const projectTaskList = await this.prisma.projectTaskList.create({
      data: {
        projectId,
        taskListId: listId,
        customName: customName || list.name,
        organizationId,
      },
    });

    // Créer une copie de chaque tâche
    await this.prisma.projectTask.createMany({
      data: list.templates.map(t => ({
        projectId,
        projectTaskListId: projectTaskList.id,
        templateId: t.id,
        categoryName: t.categoryName,
        taskTitle: t.taskTitle,
        status: 'a_faire',
        order: t.order,
        organizationId,
      })),
    });

    return this.prisma.projectTaskList.findUnique({
      where: { id: projectTaskList.id },
      include: {
        tasks: { orderBy: [{ categoryName: 'asc' }, { order: 'asc' }] },
        taskList: true,
      },
    });
  }

  // Listes d'un projet
  async getProjectTaskLists(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundException('Projet introuvable');
    return this.prisma.projectTaskList.findMany({
      where: { projectId, organizationId },
      include: {
        taskList: true,
        tasks: {
          include: {
            timeEntries: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Renommer une instance de liste dans un projet
  async renameProjectTaskList(id: string, customName: string, organizationId: string) {
    const list = await this.prisma.projectTaskList.findFirst({ where: { id, organizationId } });
    if (!list) throw new NotFoundException('Liste de projet introuvable');
    return this.prisma.projectTaskList.update({
      where: { id },
      data: { customName },
    });
  }

  // Supprimer une instance de liste d'un projet
  async deleteProjectTaskList(id: string, organizationId: string) {
    const list = await this.prisma.projectTaskList.findFirst({ where: { id, organizationId } });
    if (!list) throw new NotFoundException('Liste de projet introuvable');
    if (list.instantiationSource === 'ACTIVITY_TYPE_CONFIG') {
      throw new BadRequestException("Une checklist instanciée depuis une activité ne peut pas être supprimée");
    }
    // PostgreSQL détache atomiquement les tâches via ON DELETE SET NULL.
    // Le travail, les affectations et le temps saisi restent intacts.
    return this.prisma.projectTaskList.delete({
      where: { id },
    });
  }
}
