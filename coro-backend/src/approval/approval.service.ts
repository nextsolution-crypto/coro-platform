import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../client-portal/email.service';
import { ExportService } from '../export/export.service';
import { StorageService } from '../storage/storage.service';
import {
  AdviserActor,
  mutableProjectAccessWhere,
  projectAccessWhere,
  requireProjectApprover,
} from '../auth/project-access';
import {
  createReviewSnapshot,
  hashReviewSnapshot,
} from './document-review-integrity';

type ReviewAuditInput = {
  action: string;
  projectId: string;
  documentId: string;
  requestId: string;
  actor: AdviserActor;
  previousStatus: string;
  newStatus: string;
  contentHash: string;
  reason?: string;
  version?: number;
};

@Injectable()
export class ApprovalService {
  private readonly transactionOptions = { maxWait: 10_000, timeout: 15_000 };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
    private readonly exportService: ExportService,
    private readonly storageService: StorageService,
  ) {}

  async submit(projectId: string, actor: AdviserActor) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const project = await tx.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) },
        include: {
          client: true,
          building: true,
          user: true,
          documents: { orderBy: { updatedAt: 'desc' }, take: 1 },
        },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
      if (project.status === 'REVIEW') {
        const pending = await tx.documentReviewRequest.findFirst({
          where: { projectId, status: 'PENDING' },
          orderBy: { submittedAt: 'desc' },
        });
        if (pending && project.submittedById === actor.userId)
          return {
            project,
            request: pending,
            alreadySubmitted: true,
            eventId: null,
          };
        throw new ConflictException('Ce projet est déjà en révision');
      }
      if (
        !project.isActive ||
        project.status === 'ARCHIVED' ||
        !['DRAFT', 'IN_PROGRESS'].includes(project.status)
      )
        throw new ForbiddenException('Ce projet ne peut pas être soumis');
      const document = project.documents[0];
      if (!document || !['DRAFT', 'IN_PROGRESS'].includes(document.status))
        throw new ForbiddenException('Le document ne peut pas être soumis');
      const snapshot = this.snapshot(project, document);
      const contentHash = hashReviewSnapshot(snapshot);
      const submittedAt = new Date();
      const request = await tx.documentReviewRequest.create({
        data: {
          projectId,
          documentId: document.id,
          organizationId: actor.organizationId,
          documentVersion: document.version,
          documentLockVersion: document.lockVersion,
          contentHash,
          snapshot: snapshot as Prisma.InputJsonValue,
          submittedById: actor.userId,
          submittedAt,
        },
      });
      await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'REVIEW',
          submittedById: actor.userId,
          submittedAt,
          progress: 50,
        },
      });
      await this.createAudit(tx, {
        action: 'REVIEW_SUBMITTED',
        projectId,
        documentId: document.id,
        requestId: request.id,
        actor,
        previousStatus: project.status,
        newStatus: 'REVIEW',
        contentHash,
      });
      const event = await this.enqueueNotification(
        tx,
        request.id,
        projectId,
        actor.organizationId,
        'SUBMITTED',
      );
      return { project, request, alreadySubmitted: false, eventId: event.id };
    }, this.transactionOptions);
    if (result.eventId) void this.processNotificationEvent(result.eventId);
    return {
      success: true,
      status: 'REVIEW',
      reviewRequestId: result.request.id,
      contentHash: result.request.contentHash,
      documentVersion: result.request.documentVersion,
      alreadySubmitted: result.alreadySubmitted,
    };
  }

  async approve(projectId: string, actor: AdviserActor) {
    requireProjectApprover(actor);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const project = await tx.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) },
        include: { client: true, building: true },
      });
      if (!project || !project.isActive || project.status === 'ARCHIVED')
        throw new NotFoundException('Projet introuvable');
      if (['VALIDATED', 'EXPORTED'].includes(project.status)) {
        const decided = await tx.documentReviewRequest.findFirst({
          where: { projectId, status: 'APPROVED', decidedById: actor.userId },
          orderBy: { decidedAt: 'desc' },
        });
        if (decided?.decisionVersion)
          return {
            project,
            request: decided,
            version: decided.decisionVersion,
            approverName: '',
            eventId: null,
            replayed: true,
          };
      }
      if (project.status !== 'REVIEW')
        throw new ConflictException("Ce projet n'est plus en révision");
      if (project.submittedById === actor.userId)
        throw new ForbiddenException(
          'Vous ne pouvez pas approuver votre propre soumission',
        );
      const request = await tx.documentReviewRequest.findFirst({
        where: { projectId, status: 'PENDING' },
        orderBy: { submittedAt: 'desc' },
      });
      if (!request)
        throw new ConflictException('Demande de révision introuvable');
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "Document" WHERE id = ${request.documentId} FOR UPDATE`,
      );
      const document = await tx.document.findFirst({
        where: { id: request.documentId, projectId },
      });
      if (!document) throw new ConflictException('Document soumis introuvable');
      const currentHash = hashReviewSnapshot(this.snapshot(project, document));
      if (
        document.version !== request.documentVersion ||
        document.lockVersion !== request.documentLockVersion ||
        currentHash !== request.contentHash
      )
        throw new ConflictException({
          code: 'REVIEW_CONTENT_CHANGED',
          message:
            'Le contenu a changé depuis sa soumission. Une nouvelle révision est requise.',
          reviewRequestId: request.id,
        });
      const approver = await tx.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true },
      });
      const approverName =
        `${approver?.firstName ?? ''} ${approver?.lastName ?? ''}`.trim();
      const lastVersion = await tx.projectVersion.findFirst({
        where: { projectId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const version = (lastVersion?.versionNumber ?? 0) + 1;
      const now = new Date();
      await tx.projectVersion.create({
        data: {
          projectId,
          versionNumber: version,
          label: `v${version} — approuvé`,
          snapshot: {
            type: 'APPROVAL',
            reviewRequestId: request.id,
            documentId: request.documentId,
            documentVersion: request.documentVersion,
            documentLockVersion: request.documentLockVersion,
            contentHash: request.contentHash,
            submittedSnapshot: request.snapshot,
            approvedBy: approverName,
            approvedById: actor.userId,
            approvedAt: now.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      await tx.documentReviewRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          decidedById: actor.userId,
          decidedAt: now,
          decisionVersion: version,
        },
      });
      const transition = await tx.project.updateMany({
        where: { id: projectId, status: 'REVIEW', isActive: true },
        data: {
          status: 'VALIDATED',
          approvedById: actor.userId,
          approvedAt: now,
          progress: 75,
          officialPdfFr: null,
          officialPdfEn: null,
        },
      });
      if (transition.count !== 1)
        throw new ConflictException('La décision est devenue obsolète');
      await this.createAudit(tx, {
        action: 'REVIEW_APPROVED',
        projectId,
        documentId: request.documentId,
        requestId: request.id,
        actor,
        previousStatus: 'REVIEW',
        newStatus: 'VALIDATED',
        contentHash: request.contentHash,
        version,
      });
      const event = await this.enqueueNotification(
        tx,
        request.id,
        projectId,
        actor.organizationId,
        'APPROVED',
      );
      return {
        project,
        request,
        version,
        approverName,
        eventId: event.id,
        replayed: false,
      };
    }, this.transactionOptions);
    if (!result.replayed) {
      this.generatePreview(result.project, actor.organizationId);
      void this.processNotificationEvent(result.eventId!);
    }
    return {
      success: true,
      status: 'VALIDATED',
      version: result.version,
      reviewRequestId: result.request.id,
      contentHash: result.request.contentHash,
      replayed: result.replayed,
    };
  }

  async requestRevision(
    projectId: string,
    actor: AdviserActor,
    commentaire?: string,
  ) {
    requireProjectApprover(actor);
    const reason = commentaire?.trim();
    if (!reason) throw new BadRequestException('Le motif est requis');
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const project = await tx.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) },
        include: { client: true, building: true },
      });
      if (!project || !project.isActive || project.status === 'ARCHIVED')
        throw new NotFoundException('Projet introuvable');
      if (!['REVIEW', 'VALIDATED', 'EXPORTED'].includes(project.status))
        throw new ConflictException(
          'Ce projet ne peut pas être retourné en révision',
        );
      if (project.status === 'REVIEW' && project.submittedById === actor.userId)
        throw new ForbiddenException(
          'Vous ne pouvez pas retourner votre propre soumission',
        );
      const request = await tx.documentReviewRequest.findFirst({
        where: {
          projectId,
          status: project.status === 'REVIEW' ? 'PENDING' : 'APPROVED',
        },
        orderBy: { submittedAt: 'desc' },
      });
      if (!request)
        throw new ConflictException(
          'Cette approbation historique ne possède pas de demande de révision liée',
        );
      const now = new Date();
      if (request.status === 'PENDING')
        await tx.documentReviewRequest.update({
          where: { id: request.id },
          data: {
            status: 'RETURNED',
            decidedById: actor.userId,
            decidedAt: now,
            decisionReason: reason,
          },
        });
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'IN_PROGRESS' },
      });
      await this.createAudit(tx, {
        action: 'REVIEW_RETURNED',
        projectId,
        documentId: request.documentId,
        requestId: request.id,
        actor,
        previousStatus: project.status,
        newStatus: 'IN_PROGRESS',
        contentHash: request.contentHash,
        reason,
      });
      const event = await this.enqueueNotification(
        tx,
        request.id,
        projectId,
        actor.organizationId,
        'RETURNED',
      );
      return { project, request, eventId: event.id };
    }, this.transactionOptions);
    void this.processNotificationEvent(result.eventId);
    return {
      success: true,
      status: 'IN_PROGRESS',
      reviewRequestId: result.request.id,
    };
  }

  async getObservations(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return this.prisma.reviewObservation.findMany({
      where: { projectId, organizationId: actor.organizationId },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        treatedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addObservation(
    projectId: string,
    actor: AdviserActor,
    data: { texte: string; module?: string },
  ) {
    requireProjectApprover(actor);
    const text = data.texte?.trim();
    if (!text)
      throw new BadRequestException("Le texte de l'observation est requis");
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ...mutableProjectAccessWhere(actor),
        status: 'REVIEW',
      },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return this.prisma.reviewObservation.create({
      data: {
        projectId,
        createdById: actor.userId,
        organizationId: actor.organizationId,
        texte: text,
        module: data.module,
        statut: 'OUVERTE',
      },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async updateObservation(
    id: string,
    actor: AdviserActor,
    data: { texte?: string; module?: string; statut?: string },
  ) {
    requireProjectApprover(actor);
    const observation = await this.prisma.reviewObservation.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!observation) throw new NotFoundException('Observation introuvable');
    const project = await this.prisma.project.findFirst({
      where: {
        id: observation.projectId,
        ...mutableProjectAccessWhere(actor),
        status: 'REVIEW',
      },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Observation introuvable');
    if (data.statut && !['OUVERTE', 'TRAITEE'].includes(data.statut))
      throw new BadRequestException("Statut d'observation invalide");
    const updateData: Prisma.ReviewObservationUpdateInput = {};
    if (data.texte !== undefined) {
      const text = data.texte.trim();
      if (!text)
        throw new BadRequestException("Le texte de l'observation est requis");
      updateData.texte = text;
    }
    if (data.module !== undefined) updateData.module = data.module;
    if (data.statut !== undefined) {
      updateData.statut = data.statut;
      updateData.treatedBy =
        data.statut === 'TRAITEE'
          ? { connect: { id: actor.userId } }
          : { disconnect: true };
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

  async deleteObservation(id: string, actor: AdviserActor) {
    requireProjectApprover(actor);
    const observation = await this.prisma.reviewObservation.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!observation) throw new NotFoundException('Observation introuvable');
    const project = await this.prisma.project.findFirst({
      where: {
        id: observation.projectId,
        ...mutableProjectAccessWhere(actor),
        status: 'REVIEW',
      },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Observation introuvable');
    return this.prisma.reviewObservation.delete({ where: { id } });
  }

  async canEdit(projectId: string, actor: AdviserActor): Promise<boolean> {
    try {
      return Boolean(
        await this.prisma.project.findFirst({
          where: {
            id: projectId,
            ...mutableProjectAccessWhere(actor),
            status: { in: ['DRAFT', 'IN_PROGRESS'] },
          },
          select: { id: true },
        }),
      );
    } catch {
      return false;
    }
  }

  async canApprove(projectId: string, actor: AdviserActor) {
    try {
      requireProjectApprover(actor);
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          ...projectAccessWhere(actor),
          isActive: true,
          status: 'REVIEW',
        },
        select: { submittedById: true },
      });
      if (!project || project.submittedById === actor.userId) return null;
      return this.prisma.documentReviewRequest.findFirst({
        where: { projectId, status: 'PENDING' },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          documentId: true,
          documentVersion: true,
          contentHash: true,
          submittedAt: true,
        },
      });
    } catch {
      return null;
    }
  }

  private snapshot(project: any, document: any) {
    return createReviewSnapshot({
      project: {
        id: project.id,
        documentType: project.documentType,
        year: project.year,
        configData: project.configData,
      },
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        version: document.version,
        lockVersion: document.lockVersion,
        content: document.content,
      },
    });
  }
  private lockProject(tx: Prisma.TransactionClient, projectId: string) {
    return tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`,
    );
  }
  private createAudit(tx: Prisma.TransactionClient, input: ReviewAuditInput) {
    return tx.auditLog.create({
      data: {
        action: input.action,
        entityType: 'DOCUMENT_REVIEW',
        entityId: input.requestId,
        projectId: input.projectId,
        description: input.action,
        metadata: {
          documentId: input.documentId,
          reviewRequestId: input.requestId,
          previousStatus: input.previousStatus,
          newStatus: input.newStatus,
          contentHash: input.contentHash,
          reason: input.reason,
          version: input.version,
        },
        userId: input.actor.userId,
        organizationId: input.actor.organizationId,
      },
    });
  }
  private enqueueNotification(
    tx: Prisma.TransactionClient,
    reviewRequestId: string,
    projectId: string,
    organizationId: string,
    eventType: string,
  ) {
    return tx.documentReviewNotificationEvent.upsert({
      where: { idempotencyKey: `${reviewRequestId}:${eventType}` },
      update: {},
      create: {
        reviewRequestId,
        projectId,
        organizationId,
        eventType,
        idempotencyKey: `${reviewRequestId}:${eventType}`,
      },
    });
  }
  async processNotificationEvent(eventId: string) {
    const claim = await this.prisma.documentReviewNotificationEvent.updateMany({
      where: {
        id: eventId,
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: 3 },
      },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claim.count !== 1) return false;
    try {
      const event =
        await this.prisma.documentReviewNotificationEvent.findUniqueOrThrow({
          where: { id: eventId },
          include: {
            project: { include: { client: true, building: true } },
            reviewRequest: {
              include: {
                decidedBy: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });
      if (event.eventType === 'SUBMITTED') {
        await this.notifySubmission(
          event.project,
          event.reviewRequest.submittedById,
          event.organizationId,
        );
      } else if (event.eventType === 'APPROVED') {
        const approverName =
          `${event.reviewRequest.decidedBy?.firstName ?? ''} ${event.reviewRequest.decidedBy?.lastName ?? ''}`.trim() ||
          'Un utilisateur';
        await this.notifyApproval(
          event.project,
          approverName,
          event.reviewRequest.decisionVersion ??
            event.reviewRequest.documentVersion,
          event.organizationId,
        );
      } else if (event.eventType === 'RETURNED') {
        if (!event.reviewRequest.decidedById)
          throw new Error('MISSING_REVIEW_DECIDER');
        await this.notifyRevision(
          event.project,
          event.reviewRequest.decidedById,
          event.organizationId,
          event.reviewRequest.decisionReason ?? 'Mise à jour demandée',
        );
      } else {
        throw new Error('UNSUPPORTED_REVIEW_NOTIFICATION');
      }
      await this.prisma.documentReviewNotificationEvent.update({
        where: { id: eventId },
        data: {
          status: 'DELIVERED',
          processedAt: new Date(),
          lastErrorCode: null,
        },
      });
      return true;
    } catch (error) {
      await this.prisma.documentReviewNotificationEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED',
          lastErrorCode: error instanceof Error ? error.name : 'UNKNOWN',
        },
      });
      return false;
    }
  }

  @Cron('*/30 * * * * *')
  async retryFailedNotifications() {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    await this.prisma.documentReviewNotificationEvent.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: staleBefore } },
      data: { status: 'FAILED', lastErrorCode: 'INTERRUPTED' },
    });
    const due = await this.prisma.documentReviewNotificationEvent.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 3 } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      take: 20,
    });
    for (const event of due) await this.processNotificationEvent(event.id);
  }

  private generatePreview(project: any, organizationId: string) {
    void this.exportService
      .generatePdf(
        project.id,
        {
          selectedModules:
            project.documentType === 'PCA'
              ? [1, 2, 3, 4, 5, 6, 7, 8]
              : [1, 2, 3, 4, 6, 7, 8],
          moduleOrder:
            project.documentType === 'PCA'
              ? [1, 2, 3, 4, 5, 6, 7, 8]
              : [1, 2, 3, 4, 6, 7, 8],
          language: 'both',
          isPreview: false,
        },
        organizationId,
      )
      .then(async (pdfResult) => {
        const timestamp = Date.now();
        const [exportedPdfFr, exportedPdfEn] = await Promise.all([
          pdfResult.fr
            ? this.storageService.uploadFile(
                pdfResult.fr,
                `${project.id}-${timestamp}-FR.pdf`,
                'documents',
                'application/pdf',
              )
            : Promise.resolve(null),
          pdfResult.en
            ? this.storageService.uploadFile(
                pdfResult.en,
                `${project.id}-${timestamp}-EN.pdf`,
                'documents',
                'application/pdf',
              )
            : Promise.resolve(null),
        ]);
        await this.prisma.project.update({
          where: { id: project.id },
          data: { exportedPdfFr, exportedPdfEn },
        });
      })
      .catch((error) =>
        console.error('Erreur génération PDF après approbation:', error),
      );
  }
  private async notifySubmission(
    project: any,
    userId: string,
    organizationId: string,
  ) {
    const submitter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const name =
      `${submitter?.firstName ?? ''} ${submitter?.lastName ?? ''}`.trim() ||
      'Un utilisateur';
    await this.notifications.createForOrganization({
      organizationId,
      type: 'APPROBATION_REQUISE',
      title: 'Document soumis pour approbation',
      message: `${name} a soumis le projet "${project.name}" (${project.client.name} — ${project.building.name}) pour révision.`,
      projectId: project.id,
      excludeUserIds: [userId],
    });
  }
  private async notifyApproval(
    project: any,
    approverName: string,
    version: number,
    organizationId: string,
  ) {
    const tasks: Promise<unknown>[] = [];
    if (project.submittedById)
      tasks.push(
        this.notifications.create({
          userId: project.submittedById,
          organizationId,
          type: 'APPROUVE',
          title: 'Document approuvé',
          message: `${approverName} a approuvé le projet "${project.name}" (v${version}).`,
          projectId: project.id,
        }),
      );
    tasks.push(this.notifyClientUsers(project));
    const failed = (await Promise.allSettled(tasks)).find(
      (item) => item.status === 'rejected',
    );
    if (failed?.status === 'rejected') throw failed.reason;
  }
  private async notifyClientUsers(project: any) {
    const users = await this.prisma.clientUser.findMany({
      where: { clientId: project.clientId, isActive: true },
    });
    const results = await Promise.allSettled(
      users.map((user) =>
        this.emailService.sendDocumentAvailable({
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          projectName: project.name,
          documentType: project.documentType,
          clientName: project.client.name,
        }),
      ),
    );
    const failed = results.find(
      (item) => item.status === 'rejected' || item.value?.success !== true,
    );
    if (failed?.status === 'rejected') throw failed.reason;
    if (failed) throw new Error('EMAIL_PROVIDER_REJECTED');
  }
  private async notifyRevision(
    project: any,
    userId: string,
    organizationId: string,
    reason: string,
  ) {
    if (!project.submittedById) return;
    const reviewer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const name =
      `${reviewer?.firstName ?? ''} ${reviewer?.lastName ?? ''}`.trim() ||
      'Un utilisateur';
    await this.notifications.create({
      userId: project.submittedById,
      organizationId,
      type: 'RETOUR_REVISION',
      title: 'Document retourné pour révision',
      message: `${name} a retourné le projet "${project.name}" pour corrections. Commentaire : ${reason}`,
      projectId: project.id,
    });
  }
}
