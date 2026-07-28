import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MandateService {
  constructor(private prisma: PrismaService) {}

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
    });

    // Calculer les heures totales saisies
    const tasks = await this.prisma.projectTask.findMany({
      where: { projectId, organizationId },
      include: { timeEntries: true },
    });
    const heuresReelles = tasks.reduce((sum, t) =>
      sum + t.timeEntries.reduce((s, e) => s + e.heures, 0), 0);

    return { ...mandate, heuresReelles };
  }

  async saveMandate(projectId: string, organizationId: string, dto: any) {
    await this.assertOwnership(projectId, organizationId);
    return this.prisma.projectMandate.upsert({
      where: { projectId },
      update: {
        description: dto.description,
        montantVendu: dto.montantVendu ? parseFloat(dto.montantVendu) : null,
        tauxHoraire: dto.tauxHoraire ? parseFloat(dto.tauxHoraire) : null,
        heuresBudgetees: dto.heuresBudgetees ? parseFloat(dto.heuresBudgetees) : null,
        lienDrive: dto.lienDrive,
      },
      create: {
        projectId,
        organizationId,
        description: dto.description,
        montantVendu: dto.montantVendu ? parseFloat(dto.montantVendu) : null,
        tauxHoraire: dto.tauxHoraire ? parseFloat(dto.tauxHoraire) : null,
        heuresBudgetees: dto.heuresBudgetees ? parseFloat(dto.heuresBudgetees) : null,
        lienDrive: dto.lienDrive,
      },
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

  async updateComment(commentId: string, userId: string, contenu: string) {
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, userId },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable ou non autorisé');
    return this.prisma.projectComment.update({
      where: { id: commentId },
      data: { contenu },
      include: { user: { select: { firstName: true, lastName: true, id: true } } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, userId },
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
      },
      orderBy: [{ order: 'asc' }],
    });
  }

  async initTasksFromTemplate(projectId: string, organizationId: string, documentType: string) {
    await this.assertOwnership(projectId, organizationId);

    // Vérifier si des tâches existent déjà
    const existing = await this.prisma.projectTask.count({ where: { projectId } });
    if (existing > 0) return { message: 'Tâches déjà initialisées' };

    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { documentTypes: { has: documentType } },
          { documentTypes: { isEmpty: true } },
        ],
      },
      orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
    });

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

  async updateTask(taskId: string, organizationId: string, dto: any) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');
    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
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

  async deleteTimeEntry(entryId: string, userId: string) {
    const entry = await this.prisma.taskTimeEntry.findFirst({
      where: { id: entryId, userId },
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
}