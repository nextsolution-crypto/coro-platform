import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const NON_BILLABLE_CATEGORIES = [
  // GÉNÉRAL
  { key: 'lecture_email', label: 'Lecture de email' },
  { key: 'rencontre_hebdo_smu', label: 'Rencontre hebdomadaire SMU' },
  { key: 'echange_collegue', label: 'Échange avec un collègue (sans rapport dossier)' },
  { key: 'feuille_depenses', label: 'Feuille de dépenses et kilométrage mensuelle' },
  { key: 'formation_interne', label: 'Formation interne' },
  { key: 'recherche_norme', label: 'Recherche sur norme ou règlement' },
  { key: 'appel_prospect', label: 'Appel avec prospect ou client (sans contrat en cours)' },
  { key: 'clinique_dev', label: 'Clinique mensuelle de développement des connaissances' },
  { key: 'meeting_collegues', label: 'Meeting entre collègues' },
  { key: 'deplacement_autre', label: 'Déplacement autre que chez le client' },
  { key: 'probleme_technique', label: 'Problème technique / Support informatique / Aide' },
  { key: 'vente', label: 'Vente' },
  { key: 'maj_drive', label: 'Mise à jour du drive Garda' },
  { key: 'redaction_gabarit', label: 'Rédaction de gabarit ou de procédures (sans dossier client)' },
  { key: 'rencontre_myriam', label: 'Rencontre de suivi de projet avec Myriam' },
  { key: 'dev_innovation', label: 'Développement solution innovation technologique' },
  { key: 'creation_design', label: 'Création d\'icônes / logo / design' },
  { key: 'amelioration_methode', label: 'Amélioration / organisation / méthode de travail' },
  { key: 'admin', label: 'Gestionnaire | Coordonnateur | Administration' },
  // ABSENCES
  { key: 'jour_ferie', label: 'Jour férié' },
  { key: 'conge_paye', label: 'Congé payé' },
  { key: 'maladie', label: 'Maladie' },
  { key: 'temps_repris', label: 'Temps repris' },
];

@Injectable()
export class TimelogService {
  constructor(private prisma: PrismaService) {}

  getCatalog() {
    return NON_BILLABLE_CATEGORIES;
  }

  async getMyTimelog(userId: string, organizationId: string, dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    // Entrées hors mandat
    const timelogEntries = await this.prisma.timelogEntry.findMany({
      where: {
        userId,
        organizationId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });

    // Entrées sur mandat (tâches)
    const taskEntries = await this.prisma.taskTimeEntry.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
        task: { project: { organizationId } },
      },
      include: {
        task: {
          include: {
            project: {
              include: { client: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculer totaux
    const heuresTimelog = timelogEntries.reduce((sum, e) => sum + e.heures, 0);
    const heuresTaches = taskEntries.reduce((sum, e) => sum + e.heures, 0);
    const heuresTotal = heuresTimelog + heuresTaches;

    // Récupérer profil utilisateur pour horaire de base
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { horaireBase: true, firstName: true, lastName: true },
    });

    const horaireBase = user?.horaireBase || 40;

    // Calculer nombre de semaines dans la période
    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const semaines = diffDays / 7;
    const objectifPeriode = horaireBase * semaines;
    const tempsCumule = heuresTotal - objectifPeriode;

    return {
      timelogEntries,
      taskEntries: taskEntries.map(e => ({
        id: e.id,
        date: e.date,
        heures: e.heures,
        note: e.note,
        projectName: e.task.project.name,
        clientName: e.task.project.client?.name || '—',
        taskTitle: e.task.taskTitle,
        isBillable: true,
      })),
      summary: {
        heuresTimelog,
        heuresTaches,
        heuresTotal,
        horaireBase,
        objectifPeriode: Math.round(objectifPeriode * 10) / 10,
        tempsCumule: Math.round(tempsCumule * 10) / 10,
      },
    };
  }

  async addEntry(userId: string, organizationId: string, dto: any) {
    return this.prisma.timelogEntry.create({
      data: {
        userId,
        organizationId,
        date: new Date(dto.date),
        heures: parseFloat(dto.heures),
        category: dto.category,
        note: dto.note || null,
        isBillable: false,
      },
    });
  }

  async updateEntry(entryId: string, userId: string, dto: any) {
    return this.prisma.timelogEntry.updateMany({
      where: { id: entryId, userId },
      data: {
        heures: parseFloat(dto.heures),
        note: dto.note || null,
      },
    });
  }

  async deleteEntry(entryId: string, userId: string) {
    return this.prisma.timelogEntry.deleteMany({
      where: { id: entryId, userId },
    });
  }

  async getTeamTimelog(organizationId: string, dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const users = await this.prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true, horaireBase: true },
    });

    const result = await Promise.all(users.map(async user => {
      const timelogEntries = await this.prisma.timelogEntry.findMany({
        where: { userId: user.id, organizationId, date: { gte: from, lte: to } },
      });

      const taskEntries = await this.prisma.taskTimeEntry.findMany({
        where: {
          userId: user.id,
          date: { gte: from, lte: to },
          task: { project: { organizationId } },
        },
      });

      const heuresTimelog = timelogEntries.reduce((sum, e) => sum + e.heures, 0);
      const heuresTaches = taskEntries.reduce((sum, e) => sum + e.heures, 0);
      const heuresTotal = heuresTimelog + heuresTaches;

      const diffMs = to.getTime() - from.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const semaines = diffDays / 7;
      const horaireBase = user.horaireBase || 40;
      const objectifPeriode = horaireBase * semaines;
      const tempsCumule = heuresTotal - objectifPeriode;
      const aRempliSesHeures = heuresTotal >= objectifPeriode * 0.9;

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        horaireBase,
        heuresTotal,
        heuresTimelog,
        heuresTaches,
        objectifPeriode: Math.round(objectifPeriode * 10) / 10,
        tempsCumule: Math.round(tempsCumule * 10) / 10,
        aRempliSesHeures,
      };
    }));

    return result;
  }
}