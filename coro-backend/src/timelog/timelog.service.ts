import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_CATEGORIES = [
  { key: 'lecture_email', label: 'Lecture de email', order: 1 },
  { key: 'rencontre_hebdo_smu', label: 'Rencontre hebdomadaire SMU', order: 2 },
  { key: 'echange_collegue', label: 'Échange avec un collègue (sans rapport dossier)', order: 3 },
  { key: 'feuille_depenses', label: 'Feuille de dépenses et kilométrage mensuelle', order: 4 },
  { key: 'formation_interne', label: 'Formation interne', order: 5 },
  { key: 'recherche_norme', label: 'Recherche sur norme ou règlement', order: 6 },
  { key: 'appel_prospect', label: 'Appel avec prospect ou client (sans contrat en cours)', order: 7 },
  { key: 'clinique_dev', label: 'Clinique mensuelle de développement des connaissances', order: 8 },
  { key: 'meeting_collegues', label: 'Meeting entre collègues', order: 9 },
  { key: 'deplacement_autre', label: 'Déplacement autre que chez le client', order: 10 },
  { key: 'probleme_technique', label: 'Problème technique / Support informatique / Aide', order: 11 },
  { key: 'vente', label: 'Vente', order: 12 },
  { key: 'maj_drive', label: 'Mise à jour du drive Garda', order: 13 },
  { key: 'redaction_gabarit', label: 'Rédaction de gabarit ou de procédures (sans dossier client)', order: 14 },
  { key: 'rencontre_myriam', label: 'Rencontre de suivi de projet avec Myriam', order: 15 },
  { key: 'dev_innovation', label: 'Développement solution innovation technologique', order: 16 },
  { key: 'creation_design', label: 'Création d\'icônes / logo / design', order: 17 },
  { key: 'amelioration_methode', label: 'Amélioration / organisation / méthode de travail', order: 18 },
  { key: 'admin', label: 'Gestionnaire | Coordonnateur | Administration', order: 19 },
  { key: 'jour_ferie', label: 'Jour férié', order: 20 },
  { key: 'conge_paye', label: 'Congé payé', order: 21 },
  { key: 'maladie', label: 'Maladie', order: 22 },
  { key: 'temps_repris', label: 'Temps repris', order: 23 },
];

@Injectable()
export class TimelogService {
  constructor(private prisma: PrismaService) {}

  async getCatalog(organizationId?: string) {
    // Seed si vide
    const count = await this.prisma.timelogCategory.count({ where: { organizationId: null } });
    if (count === 0) {
      await this.prisma.timelogCategory.createMany({
        data: DEFAULT_CATEGORIES.map(c => ({ ...c, organizationId: null })),
      });
    }

    const categories = await this.prisma.timelogCategory.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: null },
          { organizationId: organizationId || null },
        ],
      },
      orderBy: { order: 'asc' },
    });

    return categories;
  }

  async addCategory(dto: any, organizationId: string) {
    const count = await this.prisma.timelogCategory.count();
    return this.prisma.timelogCategory.create({
      data: {
        key: dto.key,
        label: dto.label,
        organizationId,
        order: count + 1,
      },
    });
  }

  async updateCategory(key: string, dto: any, organizationId: string) {
    return this.prisma.timelogCategory.updateMany({
      where: { key, OR: [{ organizationId: null }, { organizationId }] },
      data: { label: dto.label },
    });
  }

  async deleteCategory(key: string, organizationId: string) {
    return this.prisma.timelogCategory.updateMany({
      where: { key, OR: [{ organizationId: null }, { organizationId }] },
      data: { isActive: false },
    });
  }

  async getMyTimelog(userId: string, organizationId: string, dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const [timelogEntries, taskEntries, user, categories] = await Promise.all([
      this.prisma.timelogEntry.findMany({
        where: { userId, organizationId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.taskTimeEntry.findMany({
        where: {
          userId,
          date: { gte: from, lte: to },
          task: { project: { organizationId } },
        },
        include: {
          task: {
            include: {
              project: { include: { client: { select: { name: true } } } },
            },
          },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { horaireBase: true },
      }),
      this.getCatalog(organizationId),
    ]);

    const heuresTimelog = timelogEntries.reduce((sum, e) => sum + e.heures, 0);
    const heuresTaches = taskEntries.reduce((sum, e) => sum + e.heures, 0);
    const heuresTotal = heuresTimelog + heuresTaches;
    const horaireBase = user?.horaireBase || 40;

    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const semaines = diffDays / 7;
    const objectifPeriode = horaireBase * semaines;
    const tempsCumule = heuresTotal - objectifPeriode;

    const categoryMap = Object.fromEntries(categories.map(c => [c.key, c.label]));

    return {
      timelogEntries: timelogEntries.map(e => ({ ...e, categoryLabel: categoryMap[e.category] || e.category })),
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

    return Promise.all(users.map(async user => {
      const [timelogEntries, taskEntries] = await Promise.all([
        this.prisma.timelogEntry.findMany({
          where: { userId: user.id, organizationId, date: { gte: from, lte: to } },
        }),
        this.prisma.taskTimeEntry.findMany({
          where: { userId: user.id, date: { gte: from, lte: to }, task: { project: { organizationId } } },
        }),
      ]);

      const heuresTimelog = timelogEntries.reduce((sum, e) => sum + e.heures, 0);
      const heuresTaches = taskEntries.reduce((sum, e) => sum + e.heures, 0);
      const heuresTotal = heuresTimelog + heuresTaches;
      const horaireBase = user.horaireBase || 40;
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const objectifPeriode = horaireBase * (diffDays / 7);
      const tempsCumule = heuresTotal - objectifPeriode;

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        horaireBase,
        heuresTotal,
        heuresTimelog,
        heuresTaches,
        objectifPeriode: Math.round(objectifPeriode * 10) / 10,
        tempsCumule: Math.round(tempsCumule * 10) / 10,
        aRempliSesHeures: heuresTotal >= objectifPeriode * 0.9,
      };
    }));
  }
}