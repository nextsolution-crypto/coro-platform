import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityTypesService } from '../activity-types/activity-types.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { requireInternal } from '../auth/work-management-access';

@Injectable()
export class ActivityTaskListsService {
  constructor(private readonly prisma: PrismaService, private readonly activityTypes: ActivityTypesService) {}

  async instantiateForActor(projectId: string, activityId: string, actor: AdviserActor) {
    requireInternal(actor);
    return this.prisma.$transaction(tx => this.instantiateMissingTaskListsForActivity(tx, projectId, activityId, actor), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  async instantiateMissingTaskListsForActivity(
    tx: Prisma.TransactionClient,
    projectId: string,
    activityId: string,
    actor: AdviserActor,
  ) {
    if (!['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(actor.role)) throw new ForbiddenException('Accès interdit');
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ProjectActivity"
      WHERE "id" = ${activityId} AND "projectId" = ${projectId}
        AND "organizationId" = ${actor.organizationId} FOR UPDATE`);
    const project = await tx.project.findFirst({ where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true, organizationId: true, documentType: true } });
    if (!project) throw new NotFoundException('Projet introuvable');
    const activity = await tx.projectActivity.findFirst({ where: {
      id: activityId, projectId: project.id, organizationId: actor.organizationId,
    }, select: { id: true, projectId: true, organizationId: true, activityTypeId: true, status: true } });
    if (!activity) throw new NotFoundException('Activité introuvable');
    if (activity.status === 'annule') throw new BadRequestException("Une activité annulée ne peut pas recevoir de checklist");
    if (!activity.activityTypeId) throw new BadRequestException("Définissez d'abord un type d'activité canonique");

    const resolved = await this.activityTypes.resolveTaskLists({
      activityTypeId: activity.activityTypeId,
      organizationId: activity.organizationId,
      documentType: project.documentType,
    }, tx);
    const existing = await tx.projectTaskList.findMany({ where: {
      activityId: activity.id, instantiationSource: 'ACTIVITY_TYPE_CONFIG',
    }, select: { id: true, taskListId: true } });
    const existingIds = new Set(existing.map(item => item.taskListId));
    const missing = resolved.filter((item: any) => !existingIds.has(item.id));
    if (!missing.length) return { createdLists: [], existingLists: existing.map(item => item.taskListId), createdTasks: 0 };

    const createdLists: string[] = [];
    let createdTasks = 0;
    for (const taskList of missing) {
      const templates = await tx.taskTemplate.findMany({ where: {
        taskListId: taskList.id, isActive: true,
        OR: [{ documentTypes: { isEmpty: true } }, { documentTypes: { has: project.documentType } }],
      }, orderBy: [{ categoryName: 'asc' }, { order: 'asc' }, { id: 'asc' }] });
      const instance = await tx.projectTaskList.create({ data: {
        projectId: project.id, organizationId: activity.organizationId, taskListId: taskList.id,
        customName: taskList.name, activityId: activity.id, instantiationSource: 'ACTIVITY_TYPE_CONFIG',
        sourceActivityTypeTaskListId: taskList.sourceActivityTypeTaskListId ?? null,
      } });
      if (templates.length) await tx.projectTask.createMany({ data: templates.map(template => ({
        projectId: project.id, organizationId: activity.organizationId, projectTaskListId: instance.id,
        activityId: activity.id, templateId: template.id, categoryName: template.categoryName,
        taskTitle: template.taskTitle, order: template.order, status: 'a_faire',
      })) });
      createdLists.push(taskList.id);
      createdTasks += templates.length;
    }
    await tx.auditLog.create({ data: {
      action: 'ACTIVITY_TASK_LISTS_INSTANTIATED', entityType: 'ProjectActivity', entityId: activity.id,
      projectId: project.id, description: 'Checklists applicables ajoutées à l’activité.',
      metadata: { activityId: activity.id, taskListIdsCreated: createdLists,
        taskListIdsAlreadyPresent: existing.map(item => item.taskListId), createdTaskCount: createdTasks,
        source: 'ACTIVITY_TYPE_CONFIG' },
      userId: actor.userId, organizationId: activity.organizationId,
    } });
    return { createdLists, existingLists: existing.map(item => item.taskListId), createdTasks };
  }
}
