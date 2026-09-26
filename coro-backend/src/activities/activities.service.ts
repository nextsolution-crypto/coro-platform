import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { ActivityTypesService } from '../activity-types/activity-types.service';
import { ActivityTaskListsService } from './activity-task-lists.service';

export const ACTIVITY_CATALOG = [
  {
    type: 'creation_document',
    label: 'Création ou mise à jour de document (PMU/PSI/PUE/PGC...)',
    duration: 'Variable',
    mode: 'presentiel',
    order: 1,
  },
  {
    type: 'formation_equipe_urgence',
    label: "Formation pour équipe d'urgence",
    duration: '2h30 – 3h00',
    mode: 'presentiel',
    order: 2,
  },
  {
    type: 'formation_equipe_urgence_exercice',
    label: "Formation pour équipe d'urgence + exercice simulé",
    duration: '3h00 – 3h30',
    mode: 'presentiel',
    order: 3,
  },
  {
    type: 'formation_travail_chaud',
    label: 'Formation travail à chaud',
    duration: '2h00',
    mode: 'presentiel',
    order: 4,
  },
  {
    type: 'formation_coordonnateur',
    label: "Formation aux coordonnateurs d'urgence",
    duration: '2h00',
    mode: 'presentiel',
    order: 5,
  },
  {
    type: 'formation_epi',
    label: 'Formation équipe de première intervention (EPI)',
    duration: '2h00',
    mode: 'presentiel',
    order: 6,
  },
  {
    type: 'formation_communication',
    label: "Formation communication d'urgence",
    duration: '2h00',
    mode: 'presentiel',
    order: 7,
  },
  {
    type: 'formation_comportement',
    label: "Formation comportement et attitude en situation d'urgence",
    duration: '2h00',
    mode: 'presentiel',
    order: 8,
  },
  {
    type: 'formation_locataires',
    label: 'Formation aux locataires',
    duration: '1h00',
    mode: 'teams',
    order: 9,
  },
  {
    type: 'exercice_table',
    label: 'Exercice de table',
    duration: '2h00',
    mode: 'teams',
    order: 10,
  },
  {
    type: 'exercice_evacuation',
    label: "Exercice d'évacuation annuel",
    duration: '3h00',
    mode: 'presentiel',
    order: 11,
  },
  {
    type: 'autre',
    label: 'Autre',
    duration: '',
    mode: 'presentiel',
    order: 12,
  },
];

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService, private readonly activityTypes: ActivityTypesService,
    @Optional() private readonly activityTaskLists?: ActivityTaskListsService) {}

  // Vérification propriété
  private async assertOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  // Catalogue des activités disponibles
  async getCatalog(actor: AdviserActor) {
    const items = await this.activityTypes.list(actor);
    return items.map((item) => ({
      activityTypeId: item.id, type: item.code, label: item.nameFR,
      duration: item.defaultDurationMinutes ? this.formatDuration(item.defaultDurationMinutes) : '',
      defaultDurationMinutes: item.defaultDurationMinutes, clientBookableDefault: item.clientBookableDefault,
      visualToken: item.visualToken, iconKey: item.iconKey, isSystem: item.isSystem,
      displayOrder: item.displayOrder, mode: 'presentiel',
    }));
  }

  private formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60); const rest = minutes % 60;
    return `${hours ? `${hours}h` : ''}${rest ? String(rest).padStart(2, '0') : hours ? '00' : ''}`;
  }

  // Récupérer les activités d'un projet
  async getActivities(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const activities = await this.prisma.projectActivity.findMany({
      where: { projectId, organizationId: actor.organizationId },
      orderBy: [{ scheduledDate: 'asc' }],
      include: {
        exerciseReport: { select: { id: true, status: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            assignees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            timeEntries: { select: { heures: true } },
          },
          orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
        },
      },
    });
    return activities.map((activity) => this.withTaskSummary(activity));
  }

  async getActivityTasks(projectId: string, activityId: string, actor: AdviserActor) {
    const found = await this.prisma.projectActivity.findFirst({
      where: {
        id: activityId, projectId, organizationId: actor.organizationId,
        project: { is: projectAccessWhere(actor) },
      },
      include: {
        project: { select: { documentType: true } },
        taskLists: {
          include: { taskList: { select: { id: true, name: true } } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            assignees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            timeEntries: { select: { heures: true } },
          },
          orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
        },
      },
    });
    const activity = found ? this.withTaskSummary(found) : null;
    if (!activity) throw new NotFoundException('Activité introuvable');
    const currentApplicableTaskLists = activity.activityTypeId
      ? await this.activityTypes.resolveTaskLists({
        activityTypeId: activity.activityTypeId,
        organizationId: actor.organizationId,
        documentType: activity.project.documentType,
      })
      : [];
    const applicableIds = new Set(currentApplicableTaskLists.map((item: any) => item.id));
    const configuredInstances = activity.taskLists.filter((item: any) =>
      item.instantiationSource === 'ACTIVITY_TYPE_CONFIG');
    const instantiatedIds = new Set(configuredInstances.map((item: any) => item.taskListId));
    const checklistTasks = new Map<string, any[]>();
    for (const task of activity.tasks) {
      if (!task.projectTaskListId) continue;
      const grouped = checklistTasks.get(task.projectTaskListId) ?? [];
      grouped.push(task); checklistTasks.set(task.projectTaskListId, grouped);
    }
    const summarizeList = (instance: any) => {
      const tasks = checklistTasks.get(instance.id) ?? [];
      const completedCount = tasks.filter((task: any) => task.status === 'fait').length;
      return {
        projectTaskListId: instance.id,
        taskListId: instance.taskListId,
        name: instance.customName || instance.taskList.name,
        instantiationSource: instance.instantiationSource,
        isCurrentlyApplicable: applicableIds.has(instance.taskListId),
        taskCount: tasks.length,
        completedCount,
        actualHours: tasks.reduce((total: number, task: any) => total + task.actualHours, 0),
        tasks,
      };
    };
    const instantiatedTaskLists = configuredInstances.map(summarizeList);
    const missingTaskLists = currentApplicableTaskLists
      .filter((item: any) => !instantiatedIds.has(item.id))
      .map((item: any) => ({ taskListId: item.id, name: item.name }));
    return {
      activity: { id: activity.id, status: activity.status, activityTypeId: activity.activityTypeId },
      activityId: activity.id,
      tasks: activity.tasks,
      directTasks: activity.tasks.filter((task: any) => !task.projectTaskListId),
      taskCount: activity.taskCount,
      taskCompletedCount: activity.taskCompletedCount,
      taskOpenCount: activity.taskOpenCount,
      taskProgressPercent: activity.taskProgressPercent,
      actualHours: activity.actualHours,
      canonicalTypeMissing: !activity.activityTypeId,
      isCancelled: activity.status === 'annule',
      currentApplicableTaskLists: currentApplicableTaskLists.map((item: any) => ({
        taskListId: item.id, name: item.name,
      })),
      instantiatedTaskLists,
      missingTaskLists,
      historicalTaskLists: instantiatedTaskLists.filter((item: any) => !item.isCurrentlyApplicable),
    };
  }

  async getTaskCandidates(projectId: string, activityId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) }, select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId, organizationId: actor.organizationId }, select: { id: true },
    });
    if (!activity) throw new NotFoundException('Activité introuvable');
    return this.prisma.projectTask.findMany({
      where: {
        projectId, organizationId: actor.organizationId, activityId: null,
        status: 'a_faire', timeEntries: { none: {} },
      },
      select: {
        id: true, activityId: true, taskTitle: true, categoryName: true, status: true,
        dueDate: true, templateId: true, projectTaskListId: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
    });
  }

  private withTaskSummary(activity: any) {
    const tasks = activity.tasks.map((task: any) => ({
      ...task,
      actualHours: task.timeEntries.reduce((total: number, entry: { heures: number }) => total + entry.heures, 0),
      timeEntries: undefined,
    }));
    const taskCount = tasks.length;
    const taskCompletedCount = tasks.filter((task: any) => task.status === 'fait').length;
    return {
      ...activity,
      tasks,
      taskCount,
      taskCompletedCount,
      taskOpenCount: taskCount - taskCompletedCount,
      taskProgressPercent: taskCount ? Math.round((taskCompletedCount / taskCount) * 100) : null,
      actualHours: tasks.reduce((total: number, task: any) => total + task.actualHours, 0),
    };
  }

  // Ajouter une activité
  async createActivity(projectId: string, actor: AdviserActor, dto: any) {
    const organizationId = actor.organizationId;
    return this.prisma.$transaction(async tx => {
      const project = await tx.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) }, select: { id: true },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
      const selectedType = dto.activityTypeId ? await tx.activityType.findFirst({ where: {
        id: dto.activityTypeId, isActive: true, OR: [{ organizationId: null }, { organizationId }],
      } }) : null;
      if (dto.activityTypeId && !selectedType) throw new BadRequestException("Type d'activité indisponible");
      const type = selectedType?.code ?? dto.type;
      const customLabel = dto.customLabel?.trim() || null;
      if (type === 'autre' && !customLabel) throw new BadRequestException('Un libellé personnalisé est requis pour Autre');
      const duration = dto.duration ?? (selectedType?.defaultDurationMinutes ? this.formatDuration(selectedType.defaultDurationMinutes) : '');
      const clientBookable = dto.clientBookable === undefined ? (selectedType?.clientBookableDefault ?? false) : dto.clientBookable === true;
      if (dto.clientVisible === false && clientBookable) {
        throw new BadRequestException('Une activité réservable doit être visible par le client');
      }
      const activity = await tx.projectActivity.create({
        data: {
          projectId,
          organizationId,
          type,
          activityTypeId: selectedType?.id ?? null,
          label: selectedType?.nameFR ?? dto.label,
          duration,
          mode: dto.mode || 'presentiel',
          customLabel,
          customDuration: dto.customDuration || null,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
          status: dto.status || 'a_faire',
          assigneeEmail: dto.assigneeEmail || null,
          clientEmail: dto.clientEmail || null,
          notes: dto.notes || null,
          clientVisible: dto.clientVisible === undefined ? true : dto.clientVisible,
          clientBookable,
          dureeHeures: dto.dureeHeures ?? (selectedType?.defaultDurationMinutes ? selectedType.defaultDurationMinutes / 60 : null),
        },
      });
      if (activity.activityTypeId) {
        if (!this.activityTaskLists) throw new Error('ActivityTaskListsService indisponible');
        await this.activityTaskLists.instantiateMissingTaskListsForActivity(tx, projectId, activity.id, actor);
      }
      return activity;
    });
  }

  // Mettre à jour une activité
  async updateActivity(activityId: string, organizationId: string, dto: any) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) throw new NotFoundException('Activité introuvable');

    const selectedType = dto.activityTypeId ? await this.prisma.activityType.findFirst({ where: {
      id: dto.activityTypeId, isActive: true, OR: [{ organizationId: null }, { organizationId }],
    } }) : null;
    if (dto.activityTypeId && !selectedType) throw new BadRequestException("Type d'activité indisponible");
    if (dto.activityTypeId !== undefined && dto.activityTypeId !== activity.activityTypeId) {
      const instantiated = await this.prisma.projectTaskList.findFirst({ where: {
        activityId, instantiationSource: 'ACTIVITY_TYPE_CONFIG',
      }, select: { id: true } });
      if (instantiated) throw new BadRequestException("Le type d'activité ne peut plus être modifié après l'instanciation d'une checklist");
    }
    const resultingType = selectedType?.code ?? dto.type ?? activity.type;
    const resultingCustomLabel = dto.customLabel === undefined ? activity.customLabel : dto.customLabel?.trim() || null;
    if (resultingType === 'autre' && !resultingCustomLabel) throw new BadRequestException('Un libellé personnalisé est requis pour Autre');

    const visible = dto.clientVisible === undefined ? activity.clientVisible : dto.clientVisible;
    const bookable = dto.clientBookable === undefined ? activity.clientBookable : dto.clientBookable;
    if (typeof visible !== 'boolean' || typeof bookable !== 'boolean' || (!visible && bookable)) {
      throw new BadRequestException('Une activité réservable doit être visible par le client');
    }
    if (dto.scheduledDate !== undefined || dto.reportedDate !== undefined) {
      const operationalBooking = await this.prisma.booking.findFirst({ where: {
        activityId, status: { in: ['CONFIRMEE', 'REPORTEE'] },
      }, select: { id: true } });
      if (operationalBooking) throw new BadRequestException('Modifier la date sur la réservation liée');
    }

    // Si statut passe à "reporte" → nouvelle date obligatoire
    const updateData: any = { ...dto };
    delete updateData.bookingId;
    delete updateData.bookings;
    delete updateData.projectId;
    delete updateData.organizationId;
    delete updateData.sourceMandate;
    if (selectedType) {
      updateData.type = selectedType.code;
      updateData.label = selectedType.nameFR;
      updateData.customLabel = resultingCustomLabel;
    }
    if (dto.status === 'reporte' && dto.reportedDate) {
      updateData.reportedDate = new Date(dto.reportedDate);
      updateData.scheduledDate = new Date(dto.reportedDate);
    }
    if (dto.scheduledDate)
      updateData.scheduledDate = new Date(dto.scheduledDate);

    return this.prisma.projectActivity.update({
      where: { id: activityId },
      data: updateData,
    });
  }

  // Supprimer une activité
  async deleteActivity(activityId: string, organizationId: string) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) throw new NotFoundException('Activité introuvable');
    const linkedBooking = await this.prisma.booking.findFirst({ where: { activityId }, select: { id: true } });
    if (linkedBooking) throw new BadRequestException('Cette activité possède un historique de réservations');
    const linkedTask = await this.prisma.projectTask.findFirst({ where: { activityId }, select: { id: true } });
    if (linkedTask) throw new BadRequestException('Cette activité possède des tâches liées');
    const linkedTaskList = await this.prisma.projectTaskList.findFirst({ where: { activityId }, select: { id: true } });
    if (linkedTaskList) throw new BadRequestException('Cette activité possède des checklists liées');
    return this.prisma.projectActivity.delete({ where: { id: activityId } });
  }

  // Dupliquer toutes les activités d'un projet +12 mois
  async duplicateActivities(projectId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    const activities = await this.prisma.projectActivity.findMany({
      where: { projectId, organizationId, isRecurring: true },
    });

    const duplicated = await Promise.all(
      activities.map((a) => {
        const newDate = a.scheduledDate
          ? new Date(
              new Date(a.scheduledDate).setFullYear(
                new Date(a.scheduledDate).getFullYear() + 1,
              ),
            )
          : null;
        return this.prisma.projectActivity.create({
          data: {
            projectId,
            organizationId,
            type: a.type,
            activityTypeId: a.activityTypeId,
            label: a.label,
            duration: a.duration,
            mode: a.mode,
            customLabel: a.customLabel,
            customDuration: a.customDuration,
            scheduledDate: newDate,
            status: 'a_faire',
            assigneeEmail: a.assigneeEmail,
            clientEmail: a.clientEmail,
            notes: a.notes,
            isRecurring: a.isRecurring,
            sourceMandate: a.sourceMandate,
          },
        });
      }),
    );
    return duplicated;
  }

  // Générer un fichier .ics pour une activité
  generateIcs(activity: any): string {
    const now = new Date();
    const formatDate = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, '');

    const start = activity.scheduledDate
      ? new Date(activity.scheduledDate)
      : now;
    // Durée en minutes selon le label
    const durationMinutes = this.parseDurationMinutes(activity.duration);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const reminderDate = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);

    const title = activity.customLabel || activity.label;
    const attendees = [
      activity.assigneeEmail
        ? `ATTENDEE;RSVP=TRUE:mailto:${activity.assigneeEmail}`
        : '',
      activity.clientEmail
        ? `ATTENDEE;RSVP=TRUE:mailto:${activity.clientEmail}`
        : '',
    ]
      .filter(Boolean)
      .join('\r\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CORO//Activités//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${activity.id}@coro.app`,
      `DTSTAMP:${formatDate(now)}Z`,
      `DTSTART:${formatDate(start)}Z`,
      `DTEND:${formatDate(end)}Z`,
      `SUMMARY:${title}`,
      `DESCRIPTION:Durée : ${activity.duration || 'À confirmer'}\\nMode : ${activity.mode === 'teams' ? 'Microsoft Teams' : 'En présentiel'}${activity.notes ? '\\nNotes : ' + activity.notes : ''}`,
      attendees,
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Rappel : ${title} dans 7 jours`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
  }

  private parseDurationMinutes(duration: string): number {
    if (!duration) return 60;
    if (duration.includes('3h30')) return 210;
    if (duration.includes('3h00') || duration.includes('3h')) return 180;
    if (duration.includes('2h30')) return 150;
    if (duration.includes('2h00') || duration.includes('2h')) return 120;
    if (duration.includes('1h00') || duration.includes('1h')) return 60;
    return 60;
  }

  // Vue portefeuille client — toutes les activités de tous les projets d'un client
  async getClientPortfolio(clientId: string, organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { clientId, organizationId, isActive: true },
      include: {
        building: true,
        activities: { orderBy: { scheduledDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = projects.reduce((sum, p) => sum + p.activities.length, 0);
    const done = projects.reduce(
      (sum, p) =>
        sum + p.activities.filter((a) => a.status === 'termine').length,
      0,
    );

    return {
      projects: projects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        buildingName: p.building.name,
        documentType: p.documentType,
        activities: p.activities,
      })),
      summary: {
        total,
        done,
        percentage: total > 0 ? Math.round((done / total) * 100) : 0,
      },
    };
  }
  async generateFromMandate(
    projectId: string,
    organizationId: string,
    services: { type: string; isRecurring: boolean }[],
  ) {
    await this.assertOwnership(projectId, organizationId);

    // Correspondance type d'activité → nom de liste de tâches
    const TASK_LIST_MAP: Record<string, string> = {
      creation_document: 'Production documentaire',
      exercice_table: "Exercice d'évacuation",
      exercice_evacuation: "Exercice d'évacuation",
      formation_equipe_urgence: "Formation mesures d'urgence",
      formation_equipe_urgence_exercice: "Formation mesures d'urgence",
      formation_travail_chaud: "Formation mesures d'urgence",
      formation_coordonnateur: "Formation mesures d'urgence",
      formation_epi: "Formation mesures d'urgence",
      formation_communication: "Formation mesures d'urgence",
      formation_comportement: "Formation mesures d'urgence",
      formation_locataires: "Formation mesures d'urgence",
    };

    const results: any[] = [];
    const importedListNames = new Set<string>();

    for (const service of services) {
      const catalog = ACTIVITY_CATALOG.find((a) => a.type === service.type);
      if (!catalog) continue;

      // Vérifier si une activité de ce type existe déjà
      const existing = await this.prisma.projectActivity.findFirst({
        where: {
          projectId,
          organizationId,
          type: service.type,
          sourceMandate: true,
        },
      });

      if (existing) {
        const updated = await this.prisma.projectActivity.update({
          where: { id: existing.id },
          data: { isRecurring: service.isRecurring },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.projectActivity.create({
          data: {
            projectId,
            organizationId,
            type: service.type,
            label: catalog.label,
            duration: catalog.duration,
            mode: catalog.mode,
            status: 'a_faire',
            isRecurring: service.isRecurring,
            sourceMandate: true,
          },
        });
        results.push(created);
      }

      // Importer la liste de tâches correspondante si pas déjà importée
      const listName = TASK_LIST_MAP[service.type];
      if (listName && !importedListNames.has(listName)) {
        // Chercher la liste globale correspondante
        const taskList = await this.prisma.taskList.findFirst({
          where: { name: listName, organizationId: null, isActive: true },
          include: {
            templates: {
              where: { isActive: true },
              orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
            },
          },
        });

        if (taskList) {
          // Vérifier si cette liste est déjà importée dans le projet
          const existingProjectList =
            await this.prisma.projectTaskList.findFirst({
              where: { projectId, taskListId: taskList.id },
            });

          if (!existingProjectList) {
            // Créer l'instance de la liste dans le projet
            const projectTaskList = await this.prisma.projectTaskList.create({
              data: {
                projectId,
                taskListId: taskList.id,
                customName: catalog.label,
                organizationId,
              },
            });

            // Créer une copie de chaque tâche
            await this.prisma.projectTask.createMany({
              data: taskList.templates.map((t) => ({
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

            importedListNames.add(listName);
          } else {
            importedListNames.add(listName);
          }
        }
      }
    }

    // Supprimer les activités sourceMandate qui ne sont plus cochées
    const selectedTypes = services.map((s) => s.type);
    await this.prisma.projectActivity.deleteMany({
      where: {
        projectId,
        organizationId,
        sourceMandate: true,
        type: { notIn: selectedTypes },
        bookings: { none: {} },
      },
    });

    return results;
  }
  // Activités récurrentes à renouveler (date passée depuis > 10 mois)
  async getRecurringToRenew(organizationId: string) {
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);

    const activities = await this.prisma.projectActivity.findMany({
      where: {
        organizationId,
        isRecurring: true,
        scheduledDate: { lte: tenMonthsAgo },
        status: { not: 'annule' },
      },
      include: {
        project: {
          include: {
            client: { select: { name: true } },
            building: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return activities.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      projectName: a.project.name,
      clientName: a.project.client.name,
      buildingName: a.project.building.name,
      label: a.customLabel || a.label,
      scheduledDate: a.scheduledDate,
      monthsAgo: Math.floor(
        (new Date().getTime() - new Date(a.scheduledDate!).getTime()) /
          (1000 * 60 * 60 * 24 * 30.44),
      ),
    }));
  }

  // Activités des 30 prochains jours
  async getUpcoming(organizationId: string) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    return this.prisma.projectActivity.findMany({
      where: {
        organizationId,
        scheduledDate: { gte: now, lte: in30Days },
        status: { notIn: ['annule', 'termine'] },
      },
      include: {
        project: {
          include: {
            client: { select: { name: true } },
            building: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}
