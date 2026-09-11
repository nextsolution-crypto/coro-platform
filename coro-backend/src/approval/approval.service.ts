import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../client-portal/email.service';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private emailService: EmailService,
  ) {}

  // ── Soumettre pour approbation ───────────────────────────
  async submit(projectId: string, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { client: true, building: true, user: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    // Idempotence légère :
    // si la soumission a déjà été enregistrée par ce même utilisateur,
    // on retourne un succès plutôt qu'une erreur.
    if (project.status === 'REVIEW') {
      if (project.submittedById === userId) {
        return { success: true, status: 'REVIEW', alreadySubmitted: true };
      }

      throw new ForbiddenException('Ce projet est déjà en révision');
    }

    // 1. Mutation métier principale.
    // Une fois cette mise à jour réussie, la soumission est considérée comme réussie.
    const submittedAt = new Date();

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'REVIEW',
        submittedById: userId,
        submittedAt,
        progress: 50,
      },
    });

    // 2. Opérations secondaires.
    // Elles ne doivent jamais faire échouer la soumission après que la mutation métier
    // a déjà été persistée.
    void this.notifySubmission(project, userId, organizationId).catch((error) => {
      console.error(
        `[ApprovalService] Erreur notification après soumission du projet ${projectId}:`,
        error,
      );
    });

    return { success: true, status: 'REVIEW' };
  }

  // ── Approuver ────────────────────────────────────────────
  async approve(projectId: string, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { client: true, building: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    if (project.status !== 'REVIEW') {
      throw new ForbiddenException('Ce projet n\'est pas en révision');
    }

    if (project.submittedById === userId) {
      throw new ForbiddenException('Vous ne pouvez pas approuver votre propre soumission');
    }

    const approver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const approverName = `${approver?.firstName ?? ''} ${approver?.lastName ?? ''}`.trim();
    const now = new Date();

    // 1. Réinitialiser les anciennes signatures.
    await this.prisma.documentSignature.deleteMany({
      where: { projectId },
    });

    // 2. Calculer le prochain numéro de version.
    const lastVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // 3. Créer la version approuvée.
    await this.prisma.projectVersion.create({
      data: {
        projectId,
        versionNumber: nextVersionNumber,
        label: `v${nextVersionNumber} — approuvé`,
        snapshot: {
          type: 'APPROVAL',
          versionNumber: nextVersionNumber,
          approvedBy: approverName,
          approvedById: userId,
          approvedAt: now.toISOString(),
          signedBy: null,
          signedAt: null,
          signedEmail: null,
        },
      },
    });

    // 4. Mutation métier principale.
    // Cette mise à jour termine l'approbation métier.
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'VALIDATED',
        approvedById: userId,
        approvedAt: now,
        progress: 75,
        officialPdfFr: null,
        officialPdfEn: null,
      },
    });

    // 5. Notifications / emails secondaires.
    // Une panne de notification ou d'email ne doit pas invalider une approbation déjà
    // enregistrée en base.
    void this.notifyApproval(
      project,
      approverName,
      nextVersionNumber,
      organizationId,
    ).catch((error) => {
      console.error(
        `[ApprovalService] Erreur notification après approbation du projet ${projectId}:`,
        error,
      );
    });

    return {
      success: true,
      status: 'VALIDATED',
      version: nextVersionNumber,
    };
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

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    if (!['REVIEW', 'VALIDATED', 'EXPORTED'].includes(project.status)) {
      throw new ForbiddenException('Ce projet ne peut pas être retourné en révision');
    }

    // Bloquer seulement si REVIEW et que c'est le soumetteur.
    if (project.status === 'REVIEW' && project.submittedById === userId) {
      throw new ForbiddenException('Vous ne pouvez pas retourner votre propre soumission');
    }

    // 1. Mutation métier principale.
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'IN_PROGRESS' },
    });

    // 2. Notification secondaire.
    void this.notifyRevision(
      project,
      userId,
      organizationId,
      commentaire,
    ).catch((error) => {
      console.error(
        `[ApprovalService] Erreur notification après retour en révision du projet ${projectId}:`,
        error,
      );
    });

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

    if (!obs) {
      throw new NotFoundException('Observation introuvable');
    }

    const updateData: any = {};

    if (data.texte !== undefined) {
      updateData.texte = data.texte;
    }

    if (data.module !== undefined) {
      updateData.module = data.module;
    }

    if (data.statut !== undefined) {
      updateData.statut = data.statut;

      if (data.statut === 'TRAITEE') {
        updateData.treatedById = userId;
      } else if (data.statut === 'OUVERTE') {
        updateData.treatedById = null;
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

    if (!obs) {
      throw new NotFoundException('Observation introuvable');
    }

    return this.prisma.reviewObservation.delete({
      where: { id },
    });
  }

  // ── Vérifier si l'utilisateur peut modifier le projet ────
  async canEdit(
    projectId: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      return false;
    }

    if (project.status === 'REVIEW' && project.submittedById === userId) {
      return false;
    }

    return true;
  }

  // ── Vérifier si l'utilisateur peut approuver ─────────────
  async canApprove(
    projectId: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      return false;
    }

    if (project.status !== 'REVIEW') {
      return false;
    }

    if (project.submittedById === userId) {
      return false;
    }

    return true;
  }

  // ── Helpers secondaires ──────────────────────────────────

  private async notifySubmission(
    project: any,
    userId: string,
    organizationId: string,
  ) {
    const submitter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const submitterName =
      `${submitter?.firstName ?? ''} ${submitter?.lastName ?? ''}`.trim() ||
      'Un utilisateur';

    await this.notifications.createForOrganization({
      organizationId,
      type: 'APPROBATION_REQUISE',
      title: '📋 Document soumis pour approbation',
      message: `${submitterName} a soumis le projet "${project.name}" (${project.client.name} — ${project.building.name}) pour révision.`,
      projectId: project.id,
      excludeUserIds: [userId],
    });
  }

  private async notifyApproval(
    project: any,
    approverName: string,
    nextVersionNumber: number,
    organizationId: string,
  ) {
    const tasks: Promise<unknown>[] = [];

    if (project.submittedById) {
      tasks.push(
        this.notifications.create({
          userId: project.submittedById,
          organizationId,
          type: 'APPROUVE',
          title: '✅ Document approuvé',
          message: `${approverName} a approuvé le projet "${project.name}" (v${nextVersionNumber}). L'export PDF est maintenant disponible.`,
          projectId: project.id,
        }),
      );
    }

    tasks.push(this.notifyClientUsers(project));

    const results = await Promise.allSettled(tasks);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(
          `[ApprovalService] Une opération secondaire d'approbation a échoué pour ${project.id}:`,
          result.reason,
        );
      }
    }
  }

  private async notifyClientUsers(project: any) {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: {
        clientId: project.clientId,
        isActive: true,
      },
    });

    const emailResults = await Promise.allSettled(
      clientUsers.map((clientUser) =>
        this.emailService.sendDocumentAvailable({
          toEmail: clientUser.email,
          toName: `${clientUser.firstName} ${clientUser.lastName}`,
          projectName: project.name,
          documentType: project.documentType,
          clientName: project.client.name,
        }),
      ),
    );

    for (const result of emailResults) {
      if (result.status === 'rejected') {
        console.error(
          `[ApprovalService] Erreur envoi email client pour le projet ${project.id}:`,
          result.reason,
        );
      }
    }
  }

  private async notifyRevision(
    project: any,
    userId: string,
    organizationId: string,
    commentaire?: string,
  ) {
    if (!project.submittedById) {
      return;
    }

    const reviewer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const reviewerName =
      `${reviewer?.firstName ?? ''} ${reviewer?.lastName ?? ''}`.trim() ||
      'Un utilisateur';

    await this.notifications.create({
      userId: project.submittedById,
      organizationId,
      type: 'RETOUR_REVISION',
      title: '🔄 Document retourné pour révision',
      message: `${reviewerName} a retourné le projet "${project.name}" pour corrections.${commentaire ? ` Commentaire : ${commentaire}` : ''}`,
      projectId: project.id,
    });
  }
}
