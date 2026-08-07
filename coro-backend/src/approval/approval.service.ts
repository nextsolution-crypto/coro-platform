import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ── Soumettre pour approbation ───────────────────────────
  async submit(projectId: string, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { client: true, building: true, user: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    if (project.status === 'REVIEW') {
      throw new ForbiddenException('Ce projet est déjà en révision');
    }

    // Mettre à jour le statut
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'REVIEW',
        submittedById: userId,
        submittedAt: new Date(),
      },
    });

    // Notifier tous les autres utilisateurs de l'org
    const submitter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    await this.notifications.createForOrganization({
      organizationId,
      type: 'APPROBATION_REQUISE',
      title: '📋 Document soumis pour approbation',
      message: `${submitter?.firstName} ${submitter?.lastName} a soumis le projet "${project.name}" (${project.client.name} — ${project.building.name}) pour révision.`,
      projectId,
      excludeUserIds: [userId],
    });

    return { success: true, status: 'REVIEW' };
  }

  // ── Approuver ────────────────────────────────────────────
  async approve(projectId: string, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { client: true, building: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status !== 'REVIEW') {
      throw new ForbiddenException('Ce projet n\'est pas en révision');
    }
    if (project.submittedById === userId) {
      throw new ForbiddenException('Vous ne pouvez pas approuver votre propre soumission');
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'VALIDATED' },
    });

    // Notifier le soumetteur
    if (project.submittedById) {
      const approver = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      await this.notifications.create({
        userId: project.submittedById,
        organizationId,
        type: 'APPROUVE',
        title: '✅ Document approuvé',
        message: `${approver?.firstName} ${approver?.lastName} a approuvé le projet "${project.name}". L'export PDF est maintenant disponible.`,
        projectId,
      });
    }

    return { success: true, status: 'VALIDATED' };
  }

  // ── Retourner pour révision ──────────────────────────────
  async requestRevision(
    projectId: string,
    userId: string,
    organizationId: string,
    commentaire?: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { client: true, building: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status !== 'REVIEW') {
      throw new ForbiddenException('Ce projet n\'est pas en révision');
    }
    if (project.submittedById === userId) {
      throw new ForbiddenException('Vous ne pouvez pas retourner votre propre soumission');
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'IN_PROGRESS' },
    });

    // Notifier le soumetteur
    if (project.submittedById) {
      const reviewer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      await this.notifications.create({
        userId: project.submittedById,
        organizationId,
        type: 'RETOUR_REVISION',
        title: '🔄 Document retourné pour révision',
        message: `${reviewer?.firstName} ${reviewer?.lastName} a retourné le projet "${project.name}" pour corrections.${commentaire ? ` Commentaire : ${commentaire}` : ''}`,
        projectId,
      });
    }

    return { success: true, status: 'IN_PROGRESS' };
  }

  // ── Observations CRUD ────────────────────────────────────
  async getObservations(projectId: string, organizationId: string) {
    return this.prisma.reviewObservation.findMany({
      where: { projectId, organizationId },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        treatedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addObservation(
    projectId: string,
    userId: string,
    organizationId: string,
    data: { texte: string; module?: string },
  ) {
    return this.prisma.reviewObservation.create({
      data: {
        projectId,
        createdById: userId,
        organizationId,
        texte: data.texte,
        module: data.module,
        statut: 'OUVERTE',
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateObservation(
    id: string,
    userId: string,
    organizationId: string,
    data: { texte?: string; module?: string; statut?: string },
  ) {
    const obs = await this.prisma.reviewObservation.findFirst({
      where: { id, organizationId },
    });
    if (!obs) throw new NotFoundException('Observation introuvable');

    const updateData: any = {};
    if (data.texte !== undefined) updateData.texte = data.texte;
    if (data.module !== undefined) updateData.module = data.module;
    if (data.statut !== undefined) {
      updateData.statut = data.statut;
      if (data.statut === 'TRAITEE') {
        updateData.treatedById = userId;
      }
    }

    return this.prisma.reviewObservation.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        treatedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async deleteObservation(id: string, organizationId: string) {
    const obs = await this.prisma.reviewObservation.findFirst({
      where: { id, organizationId },
    });
    if (!obs) throw new NotFoundException('Observation introuvable');
    return this.prisma.reviewObservation.delete({ where: { id } });
  }

  // ── Vérifier si l'utilisateur peut modifier le projet ────
  async canEdit(projectId: string, userId: string, organizationId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) return false;
    // Bloqué si EN_RÉVISION et que l'utilisateur est le soumetteur
    if (project.status === 'REVIEW' && project.submittedById === userId) {
      return false;
    }
    return true;
  }

  // ── Vérifier si l'utilisateur peut approuver ─────────────
  async canApprove(projectId: string, userId: string, organizationId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) return false;
    if (project.status !== 'REVIEW') return false;
    if (project.submittedById === userId) return false;
    return true;
  }
}