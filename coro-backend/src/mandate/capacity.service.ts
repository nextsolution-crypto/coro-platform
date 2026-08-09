import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Durées par défaut par type d'activité (en heures)
const DUREES_DEFAUT: Record<string, number> = {
  creation_document:                    0,
  formation_equipe_urgence:             3.0,
  formation_equipe_urgence_exercice:    3.5,
  formation_travail_chaud:              2.0,
  formation_coordonnateur:              2.0,
  formation_epi:                        2.0,
  formation_communication:              2.0,
  formation_comportement:               2.0,
  formation_locataires:                 1.0,
  exercice_table:                       2.0,
  exercice_evacuation:                  3.0,
};

@Injectable()
export class CapacityService {
  constructor(private prisma: PrismaService) {}

  async getCapacityPlanning(organizationId: string) {
    const today = new Date();

    // 1 — Tous les utilisateurs actifs de l'org
    const users = await this.prisma.user.findMany({
      where: { organizationId, isActive: true, role: { not: 'SUPER_ADMIN' } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        horaireBase: true,
      },
    });

    const results = await Promise.all(users.map(async user => {

      // 2 — Heures réelles sur tâches mandat (TaskTimeEntry)
      const taskEntries = await this.prisma.taskTimeEntry.findMany({
        where: { userId: user.id, organizationId },
        select: { heures: true, taskId: true },
      });
      const heuresTaskTotal = taskEntries.reduce((s, e) => s + e.heures, 0);

      // 3 — Heures timelog général (TimelogEntry)
      const timelogEntries = await this.prisma.timelogEntry.findMany({
        where: { userId: user.id, organizationId },
        select: { heures: true },
      });
      const heuresTimelogTotal = timelogEntries.reduce((s, e) => s + e.heures, 0);

      // 4 — Mandats actifs dont le conseiller est responsable
      const mandates = await this.prisma.projectMandate.findMany({
        where: {
          organizationId,
          OR: [
            { ownerId: user.id },
            { project: { userId: user.id } },
          ],
          project: {
            isActive: true,
            status: { notIn: ['VALIDATED', 'EXPORTED', 'ARCHIVED'] },
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              documentType: true,
              status: true,
              client: { select: { name: true } },
            },
          },
        },
      });

      // 5 — Heures réelles par projet (TaskTimeEntry)
      const heuresParProjet: Record<string, number> = {};
      for (const mandate of mandates) {
        const tasks = await this.prisma.projectTask.findMany({
          where: { projectId: mandate.projectId, organizationId },
          include: { timeEntries: { where: { userId: user.id } } },
        });
        const total = tasks.reduce((s, t) =>
          s + t.timeEntries.reduce((ts, e) => ts + e.heures, 0), 0);
        heuresParProjet[mandate.projectId] = total;
      }

      // 6 — Heures restantes sur mandats actifs
      const mandatsDetail = mandates.map(m => {
        const heuresReelles = heuresParProjet[m.projectId] || 0;
        const heuresBudgetees = m.heuresBudgetees || 0;
        const heuresRestantes = Math.max(0, heuresBudgetees - heuresReelles);
        return {
          projectId: m.projectId,
          projectName: m.project.name,
          documentType: m.project.documentType,
          clientName: m.project.client.name,
          projectStatus: m.project.status,
          heuresBudgetees,
          heuresReelles,
          heuresRestantes,
          dateLimite: m.dateLimite,
        };
      });

      const heuresRestantesMandats = mandatsDetail.reduce((s, m) => s + m.heuresRestantes, 0);

      // 7 — Activités futures planifiées pour ce conseiller
      const activitesFutures = await this.prisma.projectActivity.findMany({
        where: {
          organizationId,
          assigneeEmail: { not: null },
          scheduledDate: { gte: today },
          status: { notIn: ['annule', 'fait', 'termine'] },
          project: {
            OR: [
              { userId: user.id },
              { mandate: { ownerId: user.id } },
            ],
          },
        },
        include: {
          project: { select: { name: true, client: { select: { name: true } } } },
        },
      });

      const heuresActivitesFutures = activitesFutures.reduce((s, a) => {
        // Utiliser dureeHeures si saisi, sinon défaut par type
        const duree = a.dureeHeures ?? DUREES_DEFAUT[a.type] ?? 2.0;
        return s + duree;
      }, 0);

      // 8 — Calcul charge future totale
      const chargeFutureTotale = heuresRestantesMandats + heuresActivitesFutures;

      // 9 — Horizon de disponibilité
      const horaireBase = user.horaireBase || 40;
      const semainesChargees = horaireBase > 0 ? chargeFutureTotale / horaireBase : 0;
      const dateDisponibilite = new Date(today);
      dateDisponibilite.setDate(dateDisponibilite.getDate() + Math.ceil(semainesChargees * 7));

      // 10 — Taux d'occupation (charge future / capacité 12 prochaines semaines)
      const capacite12Semaines = horaireBase * 12;
      const tauxOccupation = capacite12Semaines > 0
        ? Math.min(Math.round((chargeFutureTotale / capacite12Semaines) * 100), 150)
        : 0;

      // 11 — Niveau d'alerte
      let niveau: string;
      if (tauxOccupation >= 100) niveau = 'SURCHARGE';
      else if (tauxOccupation >= 80) niveau = 'CHARGE';
      else if (tauxOccupation >= 40) niveau = 'NORMAL';
      else niveau = 'DISPONIBLE';

      return {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        horaireBase,
        // Heures passées
        heuresTaskTotal,
        heuresTimelogTotal,
        heuresTotalSaisies: heuresTaskTotal + heuresTimelogTotal,
        // Heures futures
        heuresRestantesMandats,
        heuresActivitesFutures,
        chargeFutureTotale,
        // Indicateurs
        tauxOccupation,
        semainesChargees: Math.round(semainesChargees * 10) / 10,
        dateDisponibilite,
        niveau,
        // Détail
        mandatsDetail,
        activitesFuturesCount: activitesFutures.length,
      };
    }));

    // Trier par taux d'occupation décroissant
    return results.sort((a, b) => b.tauxOccupation - a.tauxOccupation);
  }
}