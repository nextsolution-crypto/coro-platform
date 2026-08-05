import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const ACTIVITY_CATALOG = [
  { type: 'creation_document',        label: 'Création ou mise à jour de document (PMU/PSI/PUE/PGC...)', duration: 'Variable', mode: 'presentiel', order: 1 },
  { type: 'formation_equipe_urgence', label: 'Formation pour équipe d\'urgence', duration: '2h30 – 3h00', mode: 'presentiel', order: 2 },
  { type: 'formation_equipe_urgence_exercice', label: 'Formation pour équipe d\'urgence + exercice simulé', duration: '3h00 – 3h30', mode: 'presentiel', order: 3 },
  { type: 'formation_travail_chaud',  label: 'Formation travail à chaud', duration: '2h00', mode: 'presentiel', order: 4 },
  { type: 'formation_coordonnateur',  label: 'Formation aux coordonnateurs d\'urgence', duration: '2h00', mode: 'presentiel', order: 5 },
  { type: 'formation_epi',            label: 'Formation équipe de première intervention (EPI)', duration: '2h00', mode: 'presentiel', order: 6 },
  { type: 'formation_communication',  label: 'Formation communication d\'urgence', duration: '2h00', mode: 'presentiel', order: 7 },
  { type: 'formation_comportement',   label: 'Formation comportement et attitude en situation d\'urgence', duration: '2h00', mode: 'presentiel', order: 8 },
  { type: 'formation_locataires',     label: 'Formation aux locataires', duration: '1h00', mode: 'teams', order: 9 },
  { type: 'exercice_table',           label: 'Exercice de table', duration: '2h00', mode: 'teams', order: 10 },
  { type: 'exercice_evacuation',      label: 'Exercice d\'évacuation annuel', duration: '3h00', mode: 'presentiel', order: 11 },
  { type: 'autre',                    label: 'Autre', duration: '', mode: 'presentiel', order: 12 },
];

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // Vérification propriété
  private async assertOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  // Catalogue des activités disponibles
  getCatalog() {
    return ACTIVITY_CATALOG;
  }

  // Récupérer les activités d'un projet
  async getActivities(projectId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    return this.prisma.projectActivity.findMany({
      where: { projectId, organizationId },
      orderBy: [{ scheduledDate: 'asc' }],
    });
  }

  // Ajouter une activité
  async createActivity(projectId: string, organizationId: string, dto: any) {
    await this.assertOwnership(projectId, organizationId);
    return this.prisma.projectActivity.create({
      data: {
        projectId,
        organizationId,
        type: dto.type,
        label: dto.label,
        duration: dto.duration || '',
        mode: dto.mode || 'presentiel',
        customLabel: dto.customLabel || null,
        customDuration: dto.customDuration || null,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        status: dto.status || 'a_faire',
        assigneeEmail: dto.assigneeEmail || null,
        clientEmail: dto.clientEmail || null,
        notes: dto.notes || null,
      },
    });
  }

  // Mettre à jour une activité
  async updateActivity(activityId: string, organizationId: string, dto: any) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) throw new NotFoundException('Activité introuvable');

    // Si statut passe à "reporte" → nouvelle date obligatoire
    const updateData: any = { ...dto };
    if (dto.status === 'reporte' && dto.reportedDate) {
      updateData.reportedDate = new Date(dto.reportedDate);
      updateData.scheduledDate = new Date(dto.reportedDate);
    }
    if (dto.scheduledDate) updateData.scheduledDate = new Date(dto.scheduledDate);

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
    return this.prisma.projectActivity.delete({ where: { id: activityId } });
  }

  // Dupliquer toutes les activités d'un projet +12 mois
  async duplicateActivities(projectId: string, organizationId: string) {
    await this.assertOwnership(projectId, organizationId);
    const activities = await this.prisma.projectActivity.findMany({
      where: { projectId, organizationId, isRecurring: true },
    });

    const duplicated = await Promise.all(
      activities.map(a => {
        const newDate = a.scheduledDate
          ? new Date(new Date(a.scheduledDate).setFullYear(new Date(a.scheduledDate).getFullYear() + 1))
          : null;
        return this.prisma.projectActivity.create({
          data: {
            projectId,
            organizationId,
            type: a.type,
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
      })
    );
    return duplicated;
  }

  // Générer un fichier .ics pour une activité
  generateIcs(activity: any): string {
    const now = new Date();
    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const start = activity.scheduledDate ? new Date(activity.scheduledDate) : now;
    // Durée en minutes selon le label
    const durationMinutes = this.parseDurationMinutes(activity.duration);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const reminderDate = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);

    const title = activity.customLabel || activity.label;
    const attendees = [
      activity.assigneeEmail ? `ATTENDEE;RSVP=TRUE:mailto:${activity.assigneeEmail}` : '',
      activity.clientEmail ? `ATTENDEE;RSVP=TRUE:mailto:${activity.clientEmail}` : '',
    ].filter(Boolean).join('\r\n');

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
    ].filter(Boolean).join('\r\n');
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
    const done = projects.reduce((sum, p) =>
      sum + p.activities.filter(a => a.status === 'termine').length, 0);

    return {
      projects: projects.map(p => ({
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
  async generateFromMandate(projectId: string, organizationId: string, services: { type: string; isRecurring: boolean }[]) {
    await this.assertOwnership(projectId, organizationId);

    // Correspondance type d'activité → nom de liste de tâches
    const TASK_LIST_MAP: Record<string, string> = {
      'creation_document':                    'Production documentaire',
      'exercice_table':                       'Exercice d\'évacuation',
      'exercice_evacuation':                  'Exercice d\'évacuation',
      'formation_equipe_urgence':             'Formation mesures d\'urgence',
      'formation_equipe_urgence_exercice':    'Formation mesures d\'urgence',
      'formation_travail_chaud':              'Formation mesures d\'urgence',
      'formation_coordonnateur':              'Formation mesures d\'urgence',
      'formation_epi':                        'Formation mesures d\'urgence',
      'formation_communication':              'Formation mesures d\'urgence',
      'formation_comportement':               'Formation mesures d\'urgence',
      'formation_locataires':                 'Formation mesures d\'urgence',
    };

    const results: any[] = [];
    const importedListNames = new Set<string>();

    for (const service of services) {
      const catalog = ACTIVITY_CATALOG.find(a => a.type === service.type);
      if (!catalog) continue;

      // Vérifier si une activité de ce type existe déjà
      const existing = await this.prisma.projectActivity.findFirst({
        where: { projectId, organizationId, type: service.type, sourceMandate: true },
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
          const existingProjectList = await this.prisma.projectTaskList.findFirst({
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
              data: taskList.templates.map(t => ({
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
    const selectedTypes = services.map(s => s.type);
    await this.prisma.projectActivity.deleteMany({
      where: {
        projectId,
        organizationId,
        sourceMandate: true,
        type: { notIn: selectedTypes },
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

    return activities.map(a => ({
      id: a.id,
      projectId: a.projectId,
      projectName: a.project.name,
      clientName: a.project.client.name,
      buildingName: a.project.building.name,
      label: a.customLabel || a.label,
      scheduledDate: a.scheduledDate,
      monthsAgo: Math.floor(
        (new Date().getTime() - new Date(a.scheduledDate!).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
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