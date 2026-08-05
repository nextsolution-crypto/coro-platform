import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskListsService {
  constructor(private prisma: PrismaService) {}

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

  // Mettre à jour une liste
  async update(id: string, dto: any) {
    const list = await this.prisma.taskList.findUnique({ where: { id } });
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
  async delete(id: string) {
    return this.prisma.taskList.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Ajouter un template à une liste
  async addTemplate(listId: string, dto: any) {
    const list = await this.prisma.taskList.findUnique({ where: { id: listId } });
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
    const list = await this.prisma.taskList.findUnique({
      where: { id: listId },
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
  async getProjectTaskLists(projectId: string) {
    return this.prisma.projectTaskList.findMany({
      where: { projectId },
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
  async renameProjectTaskList(id: string, customName: string) {
    return this.prisma.projectTaskList.update({
      where: { id },
      data: { customName },
    });
  }

  // Supprimer une instance de liste d'un projet
  async deleteProjectTaskList(id: string) {
    // Supprimer les tâches associées d'abord
    await this.prisma.projectTask.deleteMany({
      where: { projectTaskListId: id },
    });
    return this.prisma.projectTaskList.delete({
      where: { id },
    });
  }
}