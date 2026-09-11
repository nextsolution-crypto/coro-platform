import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  // ── Déclencher un incident ────────────────────────────────────────────────

  async triggerIncident(body: any, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: body.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Snapshot occupants présents
    const presentRecords = await this.prisma.occupancyRecord.findMany({
      where: { buildingId: body.buildingId, status: 'IN', checkedInAt: { gte: startOfDay } },
    });

    // Snapshot équipe mobilisable
    const allMembers = await this.prisma.buildingEmployee.findMany({
      where: { buildingId: body.buildingId, isActive: true, isEmergencyMember: true },
      include: { emergencyRoles: { orderBy: { priority: 'asc' } }, qualifications: true },
    });
    const presentIds = new Set(
      await this.prisma.occupancyRecord.findMany({
        where: { buildingId: body.buildingId, status: 'IN', type: 'EMPLOYE', checkedInAt: { gte: startOfDay } },
        select: { employeeId: true },
      }).then(r => r.map(x => x.employeeId).filter(Boolean))
    );
    const mobilizableTeam = allMembers
      .filter(m => presentIds.has(m.id))
      .map(m => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        roles: m.emergencyRoles.map(r => r.role),
        qualifications: m.qualifications.map(q => q.type),
      }));

    // Créer l'incident
    const incident = await this.prisma.incidentEvent.create({
      data: {
        buildingId:        body.buildingId,
        organizationId,
        type:              body.type,
        triggeredBy:       body.triggeredBy,
        description:       body.description || null,
        occupantsSnapshot: presentRecords as any,
        teamSnapshot:      mobilizableTeam as any,
      },
    });

    // Créer les tâches par rôle pour chaque membre mobilisable
    const ROLE_TASKS: Record<string, string> = {
      COORDINATOR:     'Prendre en charge la coordination de l\'intervention',
      EPI:             'Intervenir avec l\'équipe de première intervention',
      ASSEMBLY_WARDEN: 'Gérer le point de rassemblement et comptabiliser les occupants',
      SEARCHER:        'Effectuer la recherche dans les zones assignées',
      EXIT_WARDEN:     'Surveiller et contrôler les sorties',
      PNA_ESCORT:      'Assister et évacuer les personnes nécessitant une assistance',
      FIRST_AIDER:     'Prodiguer les premiers soins si nécessaire',
    };

    const tasksCreated: any[] = [];
    for (const member of mobilizableTeam) {
      for (const role of member.roles) {
        const task = await this.prisma.incidentTask.create({
          data: {
            incidentEventId: incident.id,
            employeeId:      member.id,
            role:            role as any,
            title:           ROLE_TASKS[role] || `Tâche — ${role}`,
            notifiedAt:      new Date(),
          },
        });
        tasksCreated.push(task);
      }
    }

    // Log automatique
    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: incident.id,
        action:          `Incident déclenché par ${body.triggeredBy}`,
        details:         `${presentRecords.length} occupants présents — ${mobilizableTeam.length} membres d'urgence mobilisés`,
        isAutomatic:     true,
      },
    });

    return { incident, tasks: tasksCreated };
  }

  // ── Obtenir un incident actif ─────────────────────────────────────────────

  async getActiveIncident(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.incidentEvent.findFirst({
      where: { buildingId, status: 'ACTIVE', organizationId },
      orderBy: { triggeredAt: 'desc' },
      include: {
        tasks: {
          include: { employee: true },
          orderBy: { createdAt: 'asc' },
        },
        logs: { orderBy: { timestamp: 'asc' } },
      },
    });
  }

  // ── Accuser réception d'une tâche ────────────────────────────────────────

  async acknowledgeTask(taskId: string, organizationId: string) {
    const task = await this.prisma.incidentTask.findFirst({
      where: { id: taskId, incidentEvent: { organizationId } },
      include: { incidentEvent: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const updated = await this.prisma.incidentTask.update({
      where: { id: taskId },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: task.incidentEventId,
        action:          `Tâche accusée réception`,
        details:         task.title,
        isAutomatic:     false,
      },
    });

    return updated;
  }

  // ── Compléter une tâche ───────────────────────────────────────────────────

  async completeTask(taskId: string, organizationId: string) {
    const task = await this.prisma.incidentTask.findFirst({
      where: { id: taskId, incidentEvent: { organizationId } },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const updated = await this.prisma.incidentTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: task.incidentEventId,
        action:          `Tâche complétée`,
        details:         task.title,
        isAutomatic:     false,
      },
    });

    return updated;
  }

  // ── Ajouter une entrée de journal manuelle ────────────────────────────────

  async addLog(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');

    return this.prisma.incidentLog.create({
      data: {
        incidentEventId: incidentId,
        action:          body.action,
        actor:           body.actor || null,
        details:         body.details || null,
        isAutomatic:     false,
      },
    });
  }

  // ── Contenir un incident ──────────────────────────────────────────────────

  async containIncident(incidentId: string, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const updated = await this.prisma.incidentEvent.update({
      where: { id: incidentId },
      data: { status: 'CONTAINED', containedAt: new Date() },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: incidentId,
        action:          'Incident contenu',
        isAutomatic:     false,
      },
    });

    return updated;
  }

  // ── Résoudre un incident ──────────────────────────────────────────────────

  async resolveIncident(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const updated = await this.prisma.incidentEvent.update({
      where: { id: incidentId },
      data: {
        status:       'RESOLVED',
        resolvedAt:   new Date(),
        closingNotes: body.closingNotes || null,
      },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: incidentId,
        action:          'Incident résolu',
        details:         body.closingNotes || null,
        isAutomatic:     false,
      },
    });

    return updated;
  }

  // ── Historique des incidents ──────────────────────────────────────────────

  async getIncidentHistory(buildingId: string, organizationId: string) {
    return this.prisma.incidentEvent.findMany({
      where: { buildingId, organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
      include: {
        tasks: { select: { status: true } },
        logs:  { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });
  }
}