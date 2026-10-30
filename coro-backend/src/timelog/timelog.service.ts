import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimelogEntryDto, UpdateTimelogEntryDto } from './timelog.dto';

export function parseCivilDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Date civile invalide');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError('Date civile invalide');
  }
  return date;
}

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
    const category = await this.prisma.timelogCategory.findFirst({ where: { key, organizationId } });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return this.prisma.timelogCategory.updateMany({
      where: { key, organizationId },
      data: { label: dto.label },
    });
  }

  async deleteCategory(key: string, organizationId: string) {
    const category = await this.prisma.timelogCategory.findFirst({ where: { key, organizationId } });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return this.prisma.timelogCategory.updateMany({
      where: { key, organizationId },
      data: { isActive: false },
    });
  }

  async getMyTimelog(userId: string, organizationId: string, dateFrom: string, dateTo: string) {
    const { from, to } = this.parseRange(dateFrom, dateTo);

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

  async addEntry(userId: string, organizationId: string, dto: CreateTimelogEntryDto) {
    const category = await this.prisma.timelogCategory.findFirst({
      where: {
        key: dto.category,
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    const data = {
      userId,
      organizationId,
      date: parseCivilDate(dto.date),
      heures: dto.heures,
      category: dto.category,
      note: dto.note?.trim() || null,
      isBillable: false,
      clientRequestId: dto.clientRequestId,
    };
    const existing = await this.prisma.timelogEntry.findFirst({
      where: { organizationId, userId, clientRequestId: dto.clientRequestId },
    });
    if (existing) {
      if (this.sameCreateRequest(existing, data)) return existing;
      throw new ConflictException('La clé de reprise correspond à une autre saisie.');
    }
    try {
      return await this.prisma.timelogEntry.create({ data });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      const raced = await this.prisma.timelogEntry.findFirst({
        where: { organizationId, userId, clientRequestId: dto.clientRequestId },
      });
      if (raced && this.sameCreateRequest(raced, data)) return raced;
      throw new ConflictException('La saisie a déjà été traitée avec un autre contenu.');
    }
  }

  async updateEntry(entryId: string, userId: string, organizationId: string, dto: UpdateTimelogEntryDto) {
    const data: any = {
      heures: dto.heures,
      lockVersion: { increment: 1 },
    };
    if (dto.note !== undefined) data.note = dto.note.trim() || null;
    const result = await this.prisma.timelogEntry.updateMany({
      where: { id: entryId, userId, organizationId, lockVersion: dto.lockVersion },
      data,
    });
    if (result.count === 1) return { updated: true, lockVersion: dto.lockVersion + 1 };
    await this.throwMissingOrConflict(entryId, userId, organizationId);
  }

  async deleteEntry(entryId: string, userId: string, organizationId: string, lockVersion: number) {
    const result = await this.prisma.timelogEntry.deleteMany({
      where: { id: entryId, userId, organizationId, lockVersion },
    });
    if (result.count === 1) return { deleted: true };
    await this.throwMissingOrConflict(entryId, userId, organizationId);
  }

  async getTeamTimelog(organizationId: string, dateFrom: string, dateTo: string) {
    const { from, to } = this.parseRange(dateFrom, dateTo);

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

  private sameCreateRequest(existing: any, data: any) {
    return existing.date.getTime() === data.date.getTime() &&
      existing.heures === data.heures && existing.category === data.category &&
      (existing.note ?? null) === data.note;
  }

  private parseRange(dateFrom: string, dateTo: string) {
    const from = parseCivilDate(dateFrom);
    const to = parseCivilDate(dateTo);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('La date de début doit précéder ou égaler la date de fin.');
    }
    return { from, to };
  }

  private async throwMissingOrConflict(entryId: string, userId: string, organizationId: string): Promise<never> {
    const existing = await this.prisma.timelogEntry.findFirst({
      where: { id: entryId, userId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Entrée introuvable');
    throw new ConflictException('Cette entrée a été modifiée dans une autre session. Rechargez les données.');
  }
}
