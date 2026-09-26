import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { WorkManagementActor } from '../auth/work-management-access';
import { projectAccessWhere } from '../auth/project-access';
import { ActivityTypesService } from '../activity-types/activity-types.service';
import { OPEN_BOOKING_STATUSES } from '../bookings/booking-status';

@Injectable()
export class MandateService {
  constructor(private prisma: PrismaService, @Optional() private readonly activityTypes?: ActivityTypesService) {}

  private async assertOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  // ── MANDAT ──────────────────────────────────────────────

  async getMandate(projectId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    const mandate = await this.prisma.projectMandate.findUnique({
      where: { projectId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const tasks = await this.prisma.projectTask.findMany({
      where: { projectId, organizationId },
      include: { timeEntries: true },
    });
    const heuresReelles = tasks.reduce((sum, t) =>
      sum + t.timeEntries.reduce((s, e) => s + e.heures, 0), 0);

    return { ...mandate, heuresReelles };
  }

  async getWork(projectId: string, actor: WorkManagementActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: {
        id: true, name: true, documentType: true,
        mandate: { select: { heuresBudgetees: true } },
        activities: {
          orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true, activityTypeId: true, label: true, customLabel: true, duration: true,
            scheduledDate: true, status: true,
            taskLists: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: {
              id: true, taskListId: true, customName: true, instantiationSource: true,
              taskList: { select: { name: true } },
            } },
            bookings: { where: { status: { in: OPEN_BOOKING_STATUSES } }, orderBy: { updatedAt: 'desc' }, select: {
              id: true, status: true, requestedDate: true, reportedDate: true, duration: true,
              assignments: { where: { role: 'LEAD', status: { in: ['PENDING', 'ACCEPTED'] } },
                orderBy: { assignedAt: 'desc' }, take: 1,
                select: { status: true, user: { select: { id: true, firstName: true, lastName: true } } } },
            } },
          },
        },
        projectTaskLists: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: {
          id: true, activityId: true, taskListId: true, customName: true, instantiationSource: true,
          taskList: { select: { name: true } },
        } },
        projectTasks: {
          orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
          select: {
            id: true, activityId: true, projectTaskListId: true, taskTitle: true, categoryName: true,
            status: true, dueDate: true, assigneeId: true,
            assignee: { select: { id: true, firstName: true, lastName: true } },
            assignees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            timeEntries: { select: { heures: true } },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (!this.activityTypes) throw new Error('ActivityTypesService indisponible');

    const resolvedByType = await this.activityTypes.resolveTaskListsMany({
      activityTypeIds: project.activities.flatMap(activity => activity.activityTypeId ? [activity.activityTypeId] : []),
      organizationId: actor.organizationId,
      documentType: project.documentType,
    });
    const listById = new Map(project.projectTaskLists.map(list => [list.id, list]));
    const tasks = project.projectTasks.map(task => ({
      ...task,
      actualHours: task.timeEntries.reduce((sum, entry) => sum + entry.heures, 0),
      timeEntries: undefined,
    }));
    const summarizeTasks = (items: any[]) => {
      const taskCount = items.length;
      const completedTaskCount = items.filter(task => task.status === 'fait').length;
      return {
        tasks: items, taskCount, completedTaskCount, openTaskCount: taskCount - completedTaskCount,
        taskProgressPercent: taskCount ? Math.round((completedTaskCount / taskCount) * 100) : null,
        actualHours: items.reduce((sum, task) => sum + task.actualHours, 0),
      };
    };
    const activityViews = project.activities.map(activity => {
      const activityTasks = tasks.filter(task => task.activityId === activity.id);
      const applicable = activity.activityTypeId ? (resolvedByType.get(activity.activityTypeId) ?? []) : [];
      const applicableIds = new Set(applicable.map(item => item.id));
      const configuredLists = activity.taskLists.filter(list => list.instantiationSource === 'ACTIVITY_TYPE_CONFIG');
      const configuredIds = new Set(configuredLists.map(list => list.taskListId));
      const summarizeList = (list: any, listTasks: any[]) => ({
        projectTaskListId: list.id, taskListId: list.taskListId,
        name: list.customName || list.taskList.name, instantiationSource: list.instantiationSource,
        isCurrentlyApplicable: applicableIds.has(list.taskListId), ...summarizeTasks(listTasks),
      });
      const checklists = configuredLists.map(list => summarizeList(list,
        activityTasks.filter(task => task.projectTaskListId === list.id)));
      const configuredInstanceIds = new Set(configuredLists.map(list => list.id));
      const linkedExistingLists = [...new Set(activityTasks
        .filter(task => task.projectTaskListId && !configuredInstanceIds.has(task.projectTaskListId))
        .map(task => task.projectTaskListId as string))]
        .map(id => {
          const list = listById.get(id);
          return summarizeList(list ?? { id, taskListId: '', customName: 'Liste de travail existante',
            taskList: { name: 'Liste de travail existante' }, instantiationSource: null },
          activityTasks.filter(task => task.projectTaskListId === id));
        });
      const booking = activity.bookings[0] ?? null;
      const lead = booking?.assignments[0] ?? null;
      const planningStatus = !booking ? 'TO_PLAN' : lead?.status === 'PENDING' ? 'LEAD_PENDING'
        : lead?.status === 'ACCEPTED' && booking.status === 'DEMANDEE' ? 'PLANNED' : 'CONFIRMED';
      return {
        id: activity.id, activityTypeId: activity.activityTypeId,
        label: activity.customLabel || activity.label, duration: activity.duration,
        scheduledDate: activity.scheduledDate, status: activity.status,
        canonicalTypeMissing: !activity.activityTypeId, planningStatus,
        booking: booking ? { id: booking.id, status: booking.status,
          startUtc: booking.reportedDate ?? booking.requestedDate, durationMinutes: booking.duration } : null,
        lead: lead ? { id: lead.user.id, displayName: `${lead.user.firstName} ${lead.user.lastName}`, status: lead.status } : null,
        ...summarizeTasks(activityTasks),
        checklists, historicalChecklists: checklists.filter(item => !item.isCurrentlyApplicable),
        linkedExistingLists,
        directTasks: activityTasks.filter(task => !task.projectTaskListId),
        missingTaskLists: applicable.filter(item => !configuredIds.has(item.id))
          .map(item => ({ taskListId: item.id, name: item.name })),
      };
    });
    const transversal = summarizeTasks(tasks.filter(task => !task.activityId && !task.projectTaskListId));
    const legacyLists = project.projectTaskLists.filter(list => !list.activityId).map(list => ({
      projectTaskListId: list.id, taskListId: list.taskListId, name: list.customName || list.taskList.name,
      ...summarizeTasks(tasks.filter(task => !task.activityId && task.projectTaskListId === list.id)),
    }));
    const actualHours = tasks.reduce((sum, task) => sum + task.actualHours, 0);
    const plannedHours = project.activities.reduce((sum, activity) =>
      sum + activity.bookings.reduce((bookingSum, booking) => bookingSum + booking.duration / 60, 0), 0);
    const budgetHours = project.mandate?.heuresBudgetees ?? null;
    const budgetRemainingHours = budgetHours === null ? null : Math.max(budgetHours - actualHours, 0);
    const unplannedRemainingHours = budgetHours === null ? null : Math.max(budgetHours - actualHours - plannedHours, 0);
    return {
      project: { id: project.id, name: project.name, documentType: project.documentType },
      summary: { budgetHours, actualHours, plannedHours, budgetRemainingHours, unplannedRemainingHours },
      activities: activityViews,
      transversal,
      legacyLists,
      classification: { activityTaskCount: tasks.filter(task => Boolean(task.activityId)).length,
        legacyTaskCount: tasks.filter(task => !task.activityId && Boolean(task.projectTaskListId)).length,
        transversalTaskCount: transversal.taskCount, totalTaskCount: tasks.length },
    };
  }

  async saveMandate(projectId: string, organizationId: string, dto: any) {
    await this.assertOwnership(projectId, organizationId);
    if (dto.ownerId) {
      const owner = await this.prisma.user.findFirst({ where: { id: dto.ownerId, organizationId, isActive: true } });
      if (!owner) throw new NotFoundException('Responsable introuvable');
    }

    // Calcul automatique du délai si type = FORFAITAIRE et dateDebutDelai fournie
    let dateLimite: Date | null = null;
    let delaiJours: number | null = null;

    if (dto.typeMandat === 'FORFAITAIRE' && dto.dateDebutDelai) {
      const debut = new Date(dto.dateDebutDelai);
      const heures = dto.heuresBudgetees ? parseFloat(dto.heuresBudgetees) : 0;
      const documentType = dto.typeDelai || 'STANDARD';

      if (documentType === 'EVACUATION') {
        delaiJours = 15;
      } else if (heures > 0 && heures <= 30) {
        delaiJours = 21;
      } else if (heures > 30) {
        delaiJours = 90;
      } else {
        delaiJours = 21; // défaut
      }

      dateLimite = new Date(debut);
      dateLimite.setDate(dateLimite.getDate() + delaiJours);
    }

    return this.prisma.projectMandate.upsert({
      where: { projectId },
      update: {
        description: dto.description,
        montantVendu: dto.montantVendu ? parseFloat(dto.montantVendu) : null,
        tauxHoraire: dto.tauxHoraire ? parseFloat(dto.tauxHoraire) : null,
        heuresBudgetees: dto.heuresBudgetees ? parseFloat(dto.heuresBudgetees) : null,
        lienDrive: dto.lienDrive,
        ownerId: dto.ownerId || null,
        typeMandat: dto.typeMandat || null,
        typeDelai: dto.typeDelai || null,
        alerteActive: dto.alerteActive !== undefined ? dto.alerteActive : true,
        ...(dto.dateDebutDelai ? { dateDebutDelai: new Date(dto.dateDebutDelai) } : {}),
        ...(dateLimite ? { dateLimite, delaiJours } : {}),
      },
      create: {
        projectId,
        organizationId,
        description: dto.description,
        montantVendu: dto.montantVendu ? parseFloat(dto.montantVendu) : null,
        tauxHoraire: dto.tauxHoraire ? parseFloat(dto.tauxHoraire) : null,
        heuresBudgetees: dto.heuresBudgetees ? parseFloat(dto.heuresBudgetees) : null,
        lienDrive: dto.lienDrive,
        ownerId: dto.ownerId || null,
        typeMandat: dto.typeMandat || null,
        typeDelai: dto.typeDelai || null,
        alerteActive: dto.alerteActive !== undefined ? dto.alerteActive : true,
        ...(dto.dateDebutDelai ? { dateDebutDelai: new Date(dto.dateDebutDelai) } : {}),
        ...(dateLimite ? { dateLimite, delaiJours } : {}),
      },
    });
  }

  // ── Déclencher le délai quand tâche relevé = fait ────────
  async triggerDelaiFromTask(taskId: string, organizationId: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId },
      include: { project: { include: { mandate: true } } },
    });
    if (!task) return;

    const mandate = task.project.mandate;
    if (!mandate || mandate.typeMandat !== 'FORFAITAIRE') return;
    if (mandate.dateDebutDelai) return; // déjà déclenché

    // Vérifier si c'est une tâche de type "relevé technique" ou "visite"
    const isReleve = task.taskTitle.toLowerCase().includes('relev') ||
                     task.taskTitle.toLowerCase().includes('visite');
    if (!isReleve) return;

    const heures = mandate.heuresBudgetees || 0;
    const typeDelai = mandate.typeDelai || 'STANDARD';
    let delaiJours: number;

    if (typeDelai === 'EVACUATION') delaiJours = 15;
    else if (heures <= 30) delaiJours = 21;
    else delaiJours = 90;

    const dateDebutDelai = new Date();
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + delaiJours);

    await this.prisma.projectMandate.update({
      where: { projectId: task.projectId },
      data: { dateDebutDelai, dateLimite, delaiJours },
    });
  }

  // ── COMMENTAIRES ─────────────────────────────────────────

  async getComments(projectId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    return this.prisma.projectComment.findMany({
      where: { projectId, organizationId },
      include: { user: { select: { firstName: true, lastName: true, id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(projectId: string, organizationId: string, userId: string, contenu: string) {
    await this.assertOwnership(projectId, organizationId);
    return this.prisma.projectComment.create({
      data: { projectId, organizationId, userId, contenu },
      include: { user: { select: { firstName: true, lastName: true, id: true } } },
    });
  }

  async updateComment(projectId: string, commentId: string, userId: string, organizationId: string, contenu: string) {
    await this.assertOwnership(projectId, organizationId);
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, projectId, organizationId, userId },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable ou non autorisé');
    return this.prisma.projectComment.update({
      where: { id: commentId },
      data: { contenu },
      include: { user: { select: { firstName: true, lastName: true, id: true } } },
    });
  }

  async deleteComment(projectId: string, commentId: string, userId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, projectId, organizationId, userId },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable ou non autorisé');
    return this.prisma.projectComment.delete({ where: { id: commentId } });
  }

  // ── TÂCHES ───────────────────────────────────────────────

  async getTasks(projectId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    return this.prisma.projectTask.findMany({
      where: { projectId, organizationId },
      include: {
        timeEntries: {
          include: { user: { select: { firstName: true, lastName: true, id: true } } },
          orderBy: { date: 'desc' },
        },
        assignees: {
          include: { user: { select: { firstName: true, lastName: true, id: true } } },
        },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        activity: { select: { id: true, label: true, customLabel: true } },
      },
      orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
    });
  }

  async initTasksFromTemplate(projectId: string, organizationId: string, documentType: string) {
    await this.assertOwnership(projectId, organizationId);

    const existing = await this.prisma.projectTask.count({ where: { projectId } });
    if (existing > 0) return { message: 'Tâches déjà initialisées' };

    // Prendre d'abord les templates de l'organisation, sinon les globaux
    let templates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        organizationId,
        OR: [
          { documentTypes: { has: documentType } },
          { documentTypes: { isEmpty: true } },
        ],
      },
      orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
    });

    // Si aucun template org, prendre les globaux
    if (templates.length === 0) {
      templates = await this.prisma.taskTemplate.findMany({
        where: {
          isActive: true,
          organizationId: null,
          OR: [
            { documentTypes: { has: documentType } },
            { documentTypes: { isEmpty: true } },
          ],
        },
        orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
      });
    }

    if (templates.length === 0) return { message: 'Aucun template disponible' };

    await this.prisma.projectTask.createMany({
      data: templates.map(t => ({
        projectId,
        organizationId,
        templateId: t.id,
        categoryName: t.categoryName,
        taskTitle: t.taskTitle,
        order: t.order,
        status: 'a_faire',
      })),
    });

    return this.getTasks(projectId, organizationId);
  }

  async createTask(projectId: string, dto: any, actor: WorkManagementActor) {
    const taskTitle = String(dto.taskTitle ?? '').trim();
    if (!taskTitle) throw new BadRequestException('Le titre de la tâche est requis');
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) }, select: { id: true },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
      if (dto.assigneeId) {
        const assignee = await tx.user.findFirst({
          where: { id: dto.assigneeId, organizationId: actor.organizationId, isActive: true }, select: { id: true },
        });
        if (!assignee) throw new NotFoundException('Conseiller introuvable');
      }
      if (dto.activityId) {
        const activity = await tx.projectActivity.findFirst({
          where: { id: dto.activityId, projectId, organizationId: actor.organizationId }, select: { id: true },
        });
        if (!activity) throw new NotFoundException('Activité introuvable');
      }
      return tx.projectTask.create({
        data: {
          projectId, organizationId: actor.organizationId, activityId: dto.activityId || null,
          taskTitle, categoryName: String(dto.categoryName ?? 'Activité').trim() || 'Activité',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          assigneeId: dto.assigneeId || null, status: 'a_faire',
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          assignees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          timeEntries: { select: { heures: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async updateTask(taskId: string, organizationId: string, dto: any) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');
    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({ where: { id: dto.assigneeId, organizationId, isActive: true } });
      if (!assignee) throw new NotFoundException('Conseiller introuvable');
    }

    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId !== undefined ? (dto.assigneeId || null) : undefined,
      },
    });

    // Déclencher le délai si tâche relevé technique = fait
    if (dto.status === 'fait') {
      await this.triggerDelaiFromTask(taskId, organizationId).catch(() => {});
    }

    return updated;
  }

  async setTaskActivity(
    projectId: string,
    taskId: string,
    activityId: string | null,
    actor: WorkManagementActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
      const task = await tx.projectTask.findFirst({
        where: { id: taskId, projectId, organizationId: actor.organizationId },
        include: { _count: { select: { timeEntries: true } } },
      });
      if (!task) throw new NotFoundException('Tâche introuvable');
      if (task.activityId === activityId) {
        return tx.projectTask.findUnique({ where: { id: task.id }, include: { activity: true } });
      }
      if (task.activityId && activityId) {
        throw new ConflictException('La tâche est déjà liée à une autre activité');
      }
      if (task._count.timeEntries > 0 || task.status !== 'a_faire') {
        throw new ConflictException("Cette tâche contient déjà un historique d'exécution et ne peut pas être déplacée.");
      }

      if (activityId) {
        const activity = await tx.projectActivity.findFirst({
          where: { id: activityId, organizationId: actor.organizationId },
          select: { id: true, projectId: true },
        });
        if (!activity) throw new NotFoundException('Activité introuvable');
        if (activity.projectId !== projectId) {
          throw new BadRequestException('La tâche et l’activité doivent appartenir au même projet');
        }
      }

      const changed = await tx.projectTask.updateMany({
        where: {
          id: task.id,
          projectId,
          organizationId: actor.organizationId,
          activityId: task.activityId,
          status: 'a_faire',
          timeEntries: { none: {} },
        },
        data: { activityId },
      });
      if (changed.count !== 1) {
        throw new ConflictException('La tâche vient d’être modifiée; rechargez les données');
      }

      await tx.auditLog.create({ data: {
        action: activityId ? 'TASK_LINKED_TO_ACTIVITY' : 'TASK_UNLINKED_FROM_ACTIVITY',
        entityType: 'ProjectTask', entityId: task.id, projectId,
        description: activityId ? 'Tâche liée à une activité.' : 'Tâche déliée de son activité.',
        metadata: { previousActivityId: task.activityId, activityId },
        userId: actor.userId, organizationId: actor.organizationId,
      } });
      return tx.projectTask.findUnique({ where: { id: task.id }, include: { activity: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  // ── ENTRÉES DE TEMPS ─────────────────────────────────────

  async addTimeEntry(taskId: string, organizationId: string, userId: string, dto: any) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');
    return this.prisma.taskTimeEntry.create({
      data: {
        taskId,
        userId,
        organizationId,
        date: new Date(dto.date),
        heures: parseFloat(dto.heures),
        note: dto.note || null,
      },
      include: { user: { select: { firstName: true, lastName: true, id: true } } },
    });
  }

  async deleteTimeEntry(projectId: string, entryId: string, userId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    const entry = await this.prisma.taskTimeEntry.findFirst({
      where: { id: entryId, userId, organizationId, task: { projectId, organizationId } },
    });
    if (!entry) throw new NotFoundException('Entrée introuvable ou non autorisée');
    return this.prisma.taskTimeEntry.delete({ where: { id: entryId } });
  }

  // ── FEUILLE D'HEURES ─────────────────────────────────────

  async getTimesheet(projectId: string, organizationId: string, dateFrom?: string, dateTo?: string) {
    await this.assertOwnership(projectId, organizationId);

    const where: any = { task: { projectId } };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const entries = await this.prisma.taskTimeEntry.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, id: true } },
        task: { select: { categoryName: true, taskTitle: true } },
      },
      orderBy: { date: 'asc' },
    });

    const totalHeures = entries.reduce((sum, e) => sum + e.heures, 0);

    return { entries, totalHeures };
  }

  async exportTimesheetPdf(projectId: string, organizationId: string, dateFrom?: string, dateTo?: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        client: true,
        building: true,
        user: true,
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const mandate = await this.prisma.projectMandate.findUnique({ where: { projectId } });

    const where: any = { task: { projectId } };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const entries = await this.prisma.taskTimeEntry.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        task: { select: { categoryName: true, taskTitle: true } },
      },
      orderBy: { date: 'asc' },
    });

    const totalHeures = entries.reduce((sum, e) => sum + e.heures, 0);
    const taux = mandate?.tauxHoraire || 0;
    const montant = mandate?.montantVendu || 0;
    const coutReel = totalHeures * taux;

    const formatDate = (d: Date) => new Date(d).toLocaleDateString('fr-CA', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const periodLabel = dateFrom && dateTo
      ? `Du ${formatDate(new Date(dateFrom))} au ${formatDate(new Date(dateTo))}`
      : 'Toutes les périodes';

    const rows = entries.map(e => `
      <tr>
        <td>${formatDate(new Date(e.date))}</td>
        <td>${e.task?.categoryName || ''}</td>
        <td>${e.task?.taskTitle || ''}</td>
        <td>${e.user?.firstName} ${e.user?.lastName}</td>
        <td class="center">${e.heures}h</td>
        <td>${(e as any).note || '—'}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #2C3E50; padding: 40px; font-size: 12px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #C0392B; padding-bottom: 16px; }
        .logo { font-size: 24px; font-weight: 900; color: #2C3E50; }
        .logo span { color: #C0392B; }
        .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #6C757D; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .info-card { background: #F8F9FA; border: 1px solid #E9ECEF; border-radius: 6px; padding: 12px; }
        .info-label { font-size: 10px; text-transform: uppercase; color: #ADB5BD; margin-bottom: 4px; }
        .info-value { font-size: 14px; font-weight: 700; color: #2C3E50; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #2C3E50; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #E9ECEF; font-size: 11px; }
        tr:nth-child(even) td { background: #F8F9FA; }
        .center { text-align: center; }
        .total-row td { background: #FDEDEC !important; font-weight: 700; color: #C0392B; border-top: 2px solid #C0392B; }
        .footer { text-align: center; font-size: 10px; color: #ADB5BD; margin-top: 32px; border-top: 1px solid #E9ECEF; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">CO<span>RO</span></div>
          <div class="subtitle">Conformité Opérationnelle et Résilience Organisationnelle</div>
        </div>
        <div style="text-align:right">
          <div class="title">Feuille de temps</div>
          <div class="subtitle">${periodLabel}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Client</div>
          <div class="info-value">${project.client?.name || '—'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Bâtiment</div>
          <div class="info-value">${project.building?.name || '—'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Projet</div>
          <div class="info-value">${project.name}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Total heures</div>
          <div class="info-value" style="color:#2980B9">${totalHeures.toFixed(1)}h</div>
        </div>
        <div class="info-card">
          <div class="info-label">Taux horaire</div>
          <div class="info-value">${taux > 0 ? `${taux} $/h` : '—'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Montant facturable</div>
          <div class="info-value" style="color:#C0392B">${taux > 0 ? `${coutReel.toFixed(2)} $` : '—'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Tâche</th>
            <th>Conseiller</th>
            <th class="center">Heures</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="4" style="text-align:right">TOTAL</td>
            <td class="center">${totalHeures.toFixed(1)}h</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        Document généré par CORO · ${new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </body>
    </html>
    `;

    return html;
  }
  async getRendement(organizationId: string, userId?: string, dateFrom?: string, dateTo?: string) {
    const where: any = { task: { project: { organizationId } } };
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    // Toutes les entrées de temps
    const entries = await this.prisma.taskTimeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: {
          include: {
            project: {
              include: {
                mandate: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Grouper par conseiller
    const byUser: Record<string, any> = {};
    entries.forEach(e => {
      const uid = e.user.id;
      if (!byUser[uid]) {
        byUser[uid] = {
          userId: uid,
          userName: `${e.user.firstName} ${e.user.lastName}`,
          heuresTotal: 0,
          revenusTotal: 0,
          mandats: {},
        };
      }
      byUser[uid].heuresTotal += e.heures;

      // Par mandat
      const projectId = e.task.projectId;
      if (!byUser[uid].mandats[projectId]) {
        const mandate = e.task.project.mandate;
        byUser[uid].mandats[projectId] = {
          projectId,
          projectName: e.task.project.name,
          clientName: e.task.project.client?.name || '—',
          heures: 0,
          montantVendu: mandate?.montantVendu || 0,
          tauxHoraire: mandate?.tauxHoraire || 0,
          heuresBudgetees: mandate?.heuresBudgetees || 0,
        };
      }
      byUser[uid].mandats[projectId].heures += e.heures;
    });

    // Calculer revenus et marges
    const conseillers = Object.values(byUser).map((c: any) => {
      const mandatsList = Object.values(c.mandats).map((m: any) => {
        const coutReel = m.heures * m.tauxHoraire;
        const marge = m.montantVendu - coutReel;
        const margePct = m.montantVendu > 0 ? Math.round((marge / m.montantVendu) * 100) : 0;
        return { ...m, coutReel, marge, margePct };
      });

      const revenusTotal = mandatsList.reduce((sum, m) => sum + m.coutReel, 0);
      const mandatsDeficitaires = mandatsList.filter(m => m.marge < 0).length;

      return {
        ...c,
        revenusTotal,
        mandatsList,
        mandatsDeficitaires,
        mandatsCount: mandatsList.length,
      };
    });

    // Stats globales équipe
    const teamStats = {
      heuresTotal: conseillers.reduce((sum, c) => sum + c.heuresTotal, 0),
      revenusTotal: conseillers.reduce((sum, c) => sum + c.revenusTotal, 0),
      mandatsDeficitaires: conseillers.reduce((sum, c) => sum + c.mandatsDeficitaires, 0),
    };

    return { conseillers, teamStats };
  }

  // ── PORTEFEUILLE ADMIN ───────────────────────────────────
  async getPortfolio(organizationId: string) {
    const today = new Date();

    const mandates = await this.prisma.projectMandate.findMany({
      where: { organizationId },
      include: {
        project: {
          include: {
            client: { select: { name: true } },
            building: { select: { name: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Heures réelles par mandat
    const tasks = await this.prisma.projectTask.findMany({
      where: { organizationId },
      include: { timeEntries: true },
    });

    const heuresParProjet: Record<string, number> = {};
    tasks.forEach(t => {
      const total = t.timeEntries.reduce((s, e) => s + e.heures, 0);
      heuresParProjet[t.projectId] = (heuresParProjet[t.projectId] || 0) + total;
    });

    return mandates.map(m => {
      const heuresReelles = heuresParProjet[m.projectId] || 0;
      const heuresBudgetees = m.heuresBudgetees || 0;
      const budgetPct = heuresBudgetees > 0 ? Math.round((heuresReelles / heuresBudgetees) * 100) : 0;

      // Calcul délai
      let diffDays: number | null = null;
      let delaiLevel: string | null = null;
      if (m.dateLimite && m.typeMandat === 'FORFAITAIRE') {
        diffDays = Math.ceil((new Date(m.dateLimite).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        delaiLevel = diffDays < 0 ? 'DEPASSE'
          : diffDays <= 3 ? 'CRITIQUE'
          : diffDays <= 7 ? 'URGENT'
          : diffDays <= 14 ? 'ATTENTION'
          : 'OK';
      }

      return {
        mandateId: m.id,
        projectId: m.projectId,
        projectName: m.project.name,
        documentType: m.project.documentType,
        projectStatus: m.project.status,
        clientName: m.project.client.name,
        buildingName: m.project.building.name,
        conseiller: m.owner || m.project.user,
        typeMandat: m.typeMandat,
        montantVendu: m.montantVendu,
        tauxHoraire: m.tauxHoraire,
        heuresBudgetees,
        heuresReelles,
        budgetPct,
        dateLimite: m.dateLimite,
        delaiJours: m.delaiJours,
        diffDays,
        delaiLevel,
        alerteActive: m.alerteActive,
      };
    });
  }
}
