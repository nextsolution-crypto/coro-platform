import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../client-portal/email.service';
import { IncidentReportAttachmentScanner } from '../incident-reports/incident-report-attachment-scanner.service';
import { incidentReportClamavOnDemand } from '../incident-reports/incident-reports.config';
import { assertClientUploadSize, detectAllowedFileType } from '../project-files/file-type-policy';
import {
  firstResponseDueAt,
  firstResponseLabel,
  SUPPORT_IMPACTS,
  SUPPORT_TYPES,
  SupportImpact,
  supportPriority,
  supportQueue,
  SupportType,
  ticketReference,
} from './support-sla';

/** Qui agit : un utilisateur de l'app conseiller ou un client du portail. */
export type SupportActor =
  | { kind: 'USER'; userId: string; organizationId: string; role: string }
  | { kind: 'CLIENT'; clientUserId: string; clientId: string; organizationId: string; buildingIds?: string[] };

export const SUPPORT_STATUSES = ['NEW', 'IN_PROGRESS', 'WAITING_REQUESTER', 'RESOLVED', 'CLOSED'] as const;
const OPEN_STATUSES = ['NEW', 'IN_PROGRESS', 'WAITING_REQUESTER'];
const MAX_TICKETS_PER_HOUR = 10;
const MAX_ATTACHMENTS_PER_TICKET = 10;
const AUTO_CLOSE_RESOLVED_DAYS = 14;

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  IN_PROGRESS: 'En cours',
  WAITING_REQUESTER: 'En attente de votre réponse',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

type TicketWithRelations = Prisma.SupportTicketGetPayload<{
  include: { messages: { include: { attachments: true } }; attachments: true };
}>;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly email?: EmailService,
    @Optional() private readonly malwareScanner?: IncidentReportAttachmentScanner,
  ) {}

  // ─── Création ──────────────────────────────────────────────────────────────

  async createTicket(
    actor: SupportActor,
    input: { type: string; impact: string; subject: string; message: string; buildingId?: string; context?: Record<string, unknown> },
  ) {
    const type = this.parseType(input.type);
    const impact = this.parseImpact(input.impact);
    const subject = this.cleanText(input.subject, 3, 140, 'Le sujet');
    const message = this.cleanText(input.message, 10, 8000, 'Le message');
    await this.assertCreationRate(actor);

    const channel = actor.kind === 'USER' ? 'ADVISOR_APP' : 'CLIENT_PORTAL';
    const queue = supportQueue(channel, type);
    const priority = supportPriority(type, impact);
    const buildingId = await this.allowedBuildingId(actor, input.buildingId);
    const now = new Date();
    const author = await this.actorName(actor);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: actor.organizationId,
        channel,
        queue,
        type,
        impact,
        priority,
        subject,
        requesterUserId: actor.kind === 'USER' ? actor.userId : null,
        requesterClientUserId: actor.kind === 'CLIENT' ? actor.clientUserId : null,
        clientId: actor.kind === 'CLIENT' ? actor.clientId : null,
        buildingId,
        context: (this.cleanContext(input.context) ?? undefined) as Prisma.InputJsonValue | undefined,
        firstResponseDueAt: firstResponseDueAt(priority, now),
        lastRequesterActivityAt: now,
        messages: {
          create: {
            authorKind: 'REQUESTER',
            authorUserId: actor.kind === 'USER' ? actor.userId : null,
            authorClientUserId: actor.kind === 'CLIENT' ? actor.clientUserId : null,
            authorName: author,
            body: message,
          },
        },
      },
    });
    await this.notifyAgents(ticket, `Nouvelle demande ${ticketReference(ticket.number)}`, `${subject} — priorité ${priority}`);
    return this.toView(await this.loadTicket(ticket.id), actor);
  }

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async listMine(actor: SupportActor) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        archivedAt: null,
        ...(actor.kind === 'USER' ? { requesterUserId: actor.userId } : { requesterClientUserId: actor.clientUserId }),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });
    return tickets.map((ticket) => this.toSummary(ticket));
  }

  async getTicket(actor: SupportActor, id: string) {
    const ticket = await this.loadTicket(id);
    this.assertCanRead(actor, ticket);
    return this.toView(ticket, actor);
  }

  /** File de l'équipe CORO (super admin) ou de la firme-conseil (admin). */
  async listConsole(
    actor: SupportActor,
    filters: { status?: string; type?: string; scope?: string } = {},
  ) {
    if (actor.kind !== 'USER' || !this.isAgentRole(actor.role)) throw new ForbiddenException();
    const where: Prisma.SupportTicketWhereInput = { archivedAt: null };
    if (actor.role === 'SUPER_ADMIN') {
      where.queue = filters.scope === 'ADVISOR' ? 'ADVISOR' : 'CORO';
    } else {
      where.queue = 'ADVISOR';
      where.organizationId = actor.organizationId;
    }
    if (filters.status === 'OPEN') where.status = { in: OPEN_STATUSES };
    else if (filters.status && (SUPPORT_STATUSES as readonly string[]).includes(filters.status)) where.status = filters.status;
    if (filters.type && (SUPPORT_TYPES as readonly string[]).includes(filters.type)) where.type = filters.type;

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { firstResponseDueAt: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    });
    const duplicateCounts = await this.duplicateCounts(tickets.map((ticket) => ticket.id));
    const organizations = actor.role === 'SUPER_ADMIN' ? await this.organizationNames(tickets) : new Map<string, string>();
    return tickets.map((ticket) => ({
      ...this.toSummary(ticket),
      organizationName: organizations.get(ticket.organizationId) ?? null,
      duplicateCount: duplicateCounts.get(ticket.id) ?? 0,
      assignedUserId: ticket.assignedUserId,
    }));
  }

  async listAgents(actor: SupportActor) {
    if (actor.kind !== 'USER' || !this.isAgentRole(actor.role)) throw new ForbiddenException();
    return this.prisma.user.findMany({
      where:
        actor.role === 'SUPER_ADMIN'
          ? { role: UserRole.SUPER_ADMIN }
          : { organizationId: actor.organizationId, role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });
  }

  // ─── Échanges ──────────────────────────────────────────────────────────────

  async addMessage(actor: SupportActor, id: string, input: { body: string; internal?: boolean }) {
    const ticket = await this.loadTicket(id);
    this.assertCanRead(actor, ticket);
    const body = this.cleanText(input.body, 1, 8000, 'Le message');
    const agent = this.isAgentFor(actor, ticket);
    const internal = Boolean(input.internal) && agent;
    if (ticket.status === 'CLOSED' && !agent) {
      throw new ConflictException('Cette demande est fermée. Rouvrez-la pour répondre.');
    }
    const now = new Date();
    const authorKind = agent && !this.isRequester(actor, ticket) ? 'AGENT' : 'REQUESTER';

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorKind,
        authorUserId: actor.kind === 'USER' ? actor.userId : null,
        authorClientUserId: actor.kind === 'CLIENT' ? actor.clientUserId : null,
        authorName: await this.actorName(actor),
        body,
        internal,
      },
    });

    if (internal) {
      await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: now } });
    } else if (authorKind === 'AGENT') {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: ticket.status === 'NEW' || ticket.status === 'IN_PROGRESS' ? 'WAITING_REQUESTER' : ticket.status,
          firstRespondedAt: ticket.firstRespondedAt ?? now,
          lastAgentActivityAt: now,
        },
      });
      await this.notifyRequester(ticket, 'Nouvelle réponse à votre demande', body);
    } else {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: ['WAITING_REQUESTER', 'RESOLVED'].includes(ticket.status) ? 'IN_PROGRESS' : ticket.status,
          resolvedAt: ticket.status === 'RESOLVED' ? null : ticket.resolvedAt,
          lastRequesterActivityAt: now,
        },
      });
      await this.notifyAgents(ticket, `Réponse du demandeur — ${ticketReference(ticket.number)}`, ticket.subject);
    }
    return { id: message.id };
  }

  /** Le demandeur ferme sa demande (réglée) ou la rouvre. */
  async setRequesterState(actor: SupportActor, id: string, action: 'close' | 'reopen') {
    const ticket = await this.loadTicket(id);
    if (!this.isRequester(actor, ticket)) throw new ForbiddenException();
    const now = new Date();
    if (action === 'close') {
      await this.prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED', closedAt: now } });
      await this.systemMessage(id, 'Demande fermée par le demandeur.');
    } else {
      if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) throw new ConflictException('Cette demande est déjà ouverte.');
      await this.prisma.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS', closedAt: null, resolvedAt: null, lastRequesterActivityAt: now },
      });
      await this.systemMessage(id, 'Demande rouverte par le demandeur.');
      await this.notifyAgents(ticket, `Demande rouverte — ${ticketReference(ticket.number)}`, ticket.subject);
    }
    return this.getTicket(actor, id);
  }

  /** Console : statut, assignation, priorité, transfert de file, doublon. */
  async updateAsAgent(
    actor: SupportActor,
    id: string,
    input: { status?: string; assignedUserId?: string | null; priority?: number; queue?: string; duplicateOfId?: string | null },
  ) {
    const ticket = await this.loadTicket(id);
    if (!this.isAgentFor(actor, ticket) || actor.kind !== 'USER') throw new ForbiddenException();
    const data: Prisma.SupportTicketUpdateInput = {};
    const notes: string[] = [];
    const now = new Date();

    if (input.status !== undefined) {
      if (!(SUPPORT_STATUSES as readonly string[]).includes(input.status)) throw new BadRequestException('Statut invalide');
      if (input.status !== ticket.status) {
        data.status = input.status;
        if (input.status === 'RESOLVED') data.resolvedAt = now;
        if (input.status === 'CLOSED') data.closedAt = now;
        if (OPEN_STATUSES.includes(input.status)) {
          data.resolvedAt = null;
          data.closedAt = null;
        }
        notes.push(`Statut : ${STATUS_LABELS[input.status]}.`);
      }
    }
    if (input.assignedUserId !== undefined) {
      if (input.assignedUserId) {
        const agents = await this.listAgents(actor);
        if (!agents.some((agent) => agent.id === input.assignedUserId)) throw new BadRequestException('Agent invalide');
      }
      data.assignedUserId = input.assignedUserId || null;
    }
    if (input.priority !== undefined) {
      if (![1, 2, 3].includes(Number(input.priority))) throw new BadRequestException('Priorité invalide');
      if (Number(input.priority) !== ticket.priority) {
        data.priority = Number(input.priority);
        if (!ticket.firstRespondedAt) data.firstResponseDueAt = firstResponseDueAt(Number(input.priority), ticket.createdAt);
      }
    }
    if (input.queue !== undefined && input.queue !== ticket.queue) {
      if (!['CORO', 'ADVISOR'].includes(input.queue)) throw new BadRequestException('File invalide');
      if (input.queue === 'ADVISOR' && ticket.channel !== 'CLIENT_PORTAL') {
        throw new BadRequestException('Seules les demandes du portail client peuvent aller à la firme-conseil.');
      }
      data.queue = input.queue;
      data.assignedUserId = null;
      notes.push(input.queue === 'CORO' ? 'Transférée à l’équipe CORO.' : 'Transférée à la firme-conseil.');
    }
    if (input.duplicateOfId !== undefined) {
      if (input.duplicateOfId) {
        if (input.duplicateOfId === ticket.id) throw new BadRequestException('Doublon invalide');
        const parent = await this.prisma.supportTicket.findUnique({ where: { id: input.duplicateOfId } });
        if (!parent || !this.isAgentFor(actor, parent)) throw new BadRequestException('Demande d’origine introuvable');
        data.duplicateOfId = parent.id;
        data.status = 'CLOSED';
        data.closedAt = now;
        notes.push(`Regroupée avec ${ticketReference(parent.number)}, qui centralise le suivi.`);
      } else {
        data.duplicateOfId = null;
      }
    }

    await this.prisma.supportTicket.update({ where: { id }, data: { ...data, lastAgentActivityAt: now } });
    for (const note of notes) await this.systemMessage(id, note);
    if (notes.length) await this.notifyRequester(ticket, 'Votre demande a été mise à jour', notes.join(' '));
    return this.getTicket(actor, id);
  }

  // ─── Pièces jointes ────────────────────────────────────────────────────────

  async addAttachment(
    actor: SupportActor,
    id: string,
    file: { originalname: string; buffer: Buffer; size: number },
    messageId?: string,
  ) {
    const ticket = await this.loadTicket(id);
    this.assertCanRead(actor, ticket);
    if (!file?.buffer) throw new BadRequestException('Fichier manquant');
    assertClientUploadSize(file.buffer.length);
    const detected = detectAllowedFileType(file.originalname, file.buffer);
    if (ticket.attachments.length >= MAX_ATTACHMENTS_PER_TICKET) {
      throw new BadRequestException(`Au plus ${MAX_ATTACHMENTS_PER_TICKET} pièces jointes par demande.`);
    }
    if (messageId && !ticket.messages.some((message) => message.id === messageId)) {
      throw new BadRequestException('Message introuvable');
    }
    const malwareScanStatus = await this.scanForMalware(file.buffer);
    const safeName = file.originalname.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || `piece.${detected.extension}`;
    const storageKey = [
      `tenant-${ticket.organizationId.replace(/[^A-Za-z0-9_-]/g, '_')}`,
      'support-tickets',
      ticket.id,
      `${randomUUID()}.${detected.extension}`,
    ].join('/');
    await this.storage.uploadPrivateImmutable(file.buffer, storageKey, detected.mimeType);
    const attachment = await this.prisma.supportTicketAttachment.create({
      data: {
        ticketId: ticket.id,
        messageId: messageId ?? null,
        fileName: safeName,
        mimeType: detected.mimeType,
        size: file.buffer.length,
        storageKey,
        malwareScanStatus,
        malwareScannedAt: malwareScanStatus === 'CLEAN' ? new Date() : null,
      },
    });
    return this.attachmentView(attachment);
  }

  async downloadAttachment(actor: SupportActor, id: string, attachmentId: string) {
    const ticket = await this.loadTicket(id);
    this.assertCanRead(actor, ticket);
    const attachment = ticket.attachments.find((item) => item.id === attachmentId);
    if (!attachment) throw new NotFoundException();
    const message = attachment.messageId ? ticket.messages.find((item) => item.id === attachment.messageId) : null;
    if (message?.internal && !this.isAgentFor(actor, ticket)) throw new NotFoundException();
    if (attachment.malwareScanStatus === 'PENDING') {
      throw new ConflictException('Fichier en cours d’analyse antivirus. Réessayez dans quelques minutes.');
    }
    if (attachment.malwareScanStatus === 'INFECTED' || attachment.malwareScanStatus === 'FAILED') {
      throw new ForbiddenException('Fichier bloqué par l’antivirus.');
    }
    const buffer = await this.storage.downloadPrivate(attachment.storageKey);
    return { buffer, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  // ─── Tâches planifiées ─────────────────────────────────────────────────────

  /** Une demande résolue sans nouvelle du demandeur se ferme après 14 jours. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async closeStaleResolved(now = new Date()) {
    const limit = new Date(now.getTime() - AUTO_CLOSE_RESOLVED_DAYS * 24 * 3600_000);
    const stale = await this.prisma.supportTicket.findMany({
      where: { status: 'RESOLVED', resolvedAt: { lt: limit } },
      select: { id: true },
      take: 500,
    });
    for (const ticket of stale) {
      await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'CLOSED', closedAt: now } });
      await this.systemMessage(ticket.id, `Fermée automatiquement ${AUTO_CLOSE_RESOLVED_DAYS} jours après sa résolution.`);
    }
    return { closed: stale.length };
  }

  // ─── Règles d'accès ────────────────────────────────────────────────────────

  private isAgentRole(role: string) {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  isAgentFor(actor: SupportActor, ticket: { queue: string; organizationId: string }) {
    if (actor.kind !== 'USER') return false;
    if (ticket.queue === 'CORO') return actor.role === 'SUPER_ADMIN';
    return actor.organizationId === ticket.organizationId && this.isAgentRole(actor.role);
  }

  private isRequester(actor: SupportActor, ticket: { requesterUserId: string | null; requesterClientUserId: string | null }) {
    return actor.kind === 'USER'
      ? ticket.requesterUserId === actor.userId
      : ticket.requesterClientUserId === actor.clientUserId;
  }

  private assertCanRead(actor: SupportActor, ticket: TicketWithRelations) {
    if (this.isRequester(actor, ticket) || this.isAgentFor(actor, ticket)) return;
    throw new NotFoundException('Demande introuvable');
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  private async notifyAgents(ticket: { id: string; number: number; queue: string; organizationId: string; assignedUserId: string | null }, title: string, message: string) {
    try {
      const agents = ticket.assignedUserId
        ? [{ id: ticket.assignedUserId, organizationId: ticket.organizationId }]
        : await this.prisma.user.findMany({
            where: ticket.queue === 'CORO'
              ? { role: UserRole.SUPER_ADMIN }
              : { organizationId: ticket.organizationId, role: UserRole.ADMIN },
            select: { id: true, organizationId: true },
            take: 50,
          });
      for (const agent of agents) {
        await this.prisma.notification.create({
          data: {
            userId: agent.id,
            organizationId: agent.organizationId,
            type: 'SUPPORT_TICKET',
            title,
            message: message.slice(0, 300),
            link: `/support/console/${ticket.id}`,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`SUPPORT_NOTIFY_AGENTS_FAILED ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  private async notifyRequester(
    ticket: { id: string; number: number; subject: string; organizationId: string; requesterUserId: string | null; requesterClientUserId: string | null },
    title: string,
    message: string,
  ) {
    try {
      const reference = ticketReference(ticket.number);
      if (ticket.requesterUserId) {
        const user = await this.prisma.user.findUnique({
          where: { id: ticket.requesterUserId },
          select: { id: true, email: true, firstName: true, organizationId: true },
        });
        if (!user) return;
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            organizationId: user.organizationId,
            type: 'SUPPORT_TICKET',
            title: `${title} — ${reference}`,
            message: message.slice(0, 300),
            link: `/support/${ticket.id}`,
          },
        });
        await this.email?.sendSupportTicketUpdate({
          toEmail: user.email,
          toName: user.firstName,
          reference,
          subject: ticket.subject,
          headline: title,
          url: `https://app.getcoro.io/support/${ticket.id}`,
        });
      } else if (ticket.requesterClientUserId) {
        const client = await this.prisma.clientUser.findUnique({
          where: { id: ticket.requesterClientUserId },
          select: { email: true, firstName: true },
        });
        if (!client) return;
        await this.email?.sendSupportTicketUpdate({
          toEmail: client.email,
          toName: client.firstName,
          reference,
          subject: ticket.subject,
          headline: title,
          url: `${(process.env.CLIENT_PORTAL_PUBLIC_URL || 'https://client.getcoro.io').replace(/\/$/, '')}/support/${ticket.id}`,
        });
      }
    } catch (error) {
      this.logger.warn(`SUPPORT_NOTIFY_REQUESTER_FAILED ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // ─── Utilitaires ───────────────────────────────────────────────────────────

  private async loadTicket(id: string): Promise<TicketWithRelations> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, include: { attachments: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket || ticket.archivedAt) throw new NotFoundException('Demande introuvable');
    return ticket;
  }

  private toSummary(ticket: {
    id: string; number: number; type: string; impact: string; priority: number; status: string; queue: string;
    channel: string; subject: string; createdAt: Date; updatedAt: Date; firstResponseDueAt: Date; firstRespondedAt: Date | null;
  }) {
    return {
      id: ticket.id,
      reference: ticketReference(ticket.number),
      type: ticket.type,
      impact: ticket.impact,
      priority: ticket.priority,
      status: ticket.status,
      queue: ticket.queue,
      channel: ticket.channel,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      firstResponseDueAt: ticket.firstResponseDueAt,
      firstRespondedAt: ticket.firstRespondedAt,
      firstResponseTarget: firstResponseLabel(ticket.priority),
      overdue: !ticket.firstRespondedAt && ticket.firstResponseDueAt.getTime() < Date.now() && OPEN_STATUSES.includes(ticket.status),
    };
  }

  private toView(ticket: TicketWithRelations, actor: SupportActor) {
    const agent = this.isAgentFor(actor, ticket);
    const visibleMessages = ticket.messages.filter((message) => agent || !message.internal);
    const visibleIds = new Set(visibleMessages.map((message) => message.id));
    return {
      ...this.toSummary(ticket),
      isAgent: agent,
      isRequester: this.isRequester(actor, ticket),
      buildingId: ticket.buildingId,
      assignedUserId: agent ? ticket.assignedUserId : undefined,
      duplicateOfId: ticket.duplicateOfId,
      context: agent ? ticket.context : undefined,
      messages: visibleMessages.map((message) => ({
        id: message.id,
        authorKind: message.authorKind,
        authorName: message.authorName,
        body: message.body,
        internal: message.internal,
        createdAt: message.createdAt,
      })),
      attachments: ticket.attachments
        .filter((attachment) => !attachment.messageId || visibleIds.has(attachment.messageId))
        .map((attachment) => this.attachmentView(attachment)),
    };
  }

  private attachmentView(attachment: { id: string; fileName: string; mimeType: string; size: number; messageId: string | null; malwareScanStatus: string | null; createdAt: Date }) {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      messageId: attachment.messageId,
      scanStatus: attachment.malwareScanStatus,
      downloadable: !attachment.malwareScanStatus || attachment.malwareScanStatus === 'CLEAN',
      createdAt: attachment.createdAt,
    };
  }

  private async systemMessage(ticketId: string, body: string) {
    await this.prisma.supportTicketMessage.create({
      data: { ticketId, authorKind: 'SYSTEM', authorName: 'CORO', body },
    });
  }

  private async duplicateCounts(ids: string[]) {
    if (!ids.length) return new Map<string, number>();
    const rows = await this.prisma.supportTicket.groupBy({
      by: ['duplicateOfId'],
      where: { duplicateOfId: { in: ids } },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.duplicateOfId as string, row._count._all]));
  }

  private async organizationNames(tickets: { organizationId: string }[]) {
    const ids = [...new Set(tickets.map((ticket) => ticket.organizationId))];
    if (!ids.length) return new Map<string, string>();
    const rows = await this.prisma.organization.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return new Map(rows.map((row) => [row.id, row.name]));
  }

  private async actorName(actor: SupportActor): Promise<string> {
    if (actor.kind === 'USER') {
      const user = await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { firstName: true, lastName: true } });
      return user ? `${user.firstName} ${user.lastName}`.trim() : 'Utilisateur';
    }
    const client = await this.prisma.clientUser.findUnique({ where: { id: actor.clientUserId }, select: { firstName: true, lastName: true } });
    return client ? `${client.firstName} ${client.lastName ?? ''}`.trim() : 'Client';
  }

  private async allowedBuildingId(actor: SupportActor, buildingId?: string) {
    if (!buildingId) return null;
    const building = await this.prisma.building.findFirst({
      where: {
        id: buildingId,
        organizationId: actor.organizationId,
        ...(actor.kind === 'CLIENT' ? { clientId: actor.clientId } : {}),
      },
      select: { id: true },
    });
    if (!building) return null;
    if (actor.kind === 'CLIENT' && actor.buildingIds?.length && !actor.buildingIds.includes(building.id)) return null;
    return building.id;
  }

  private async assertCreationRate(actor: SupportActor) {
    const since = new Date(Date.now() - 3600_000);
    const count = await this.prisma.supportTicket.count({
      where: {
        createdAt: { gte: since },
        ...(actor.kind === 'USER' ? { requesterUserId: actor.userId } : { requesterClientUserId: actor.clientUserId }),
      },
    });
    if (count >= MAX_TICKETS_PER_HOUR) {
      throw new HttpException('Trop de demandes en une heure. Réessayez plus tard.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async scanForMalware(bytes: Buffer): Promise<'CLEAN' | 'PENDING' | null> {
    if (!this.malwareScanner) return incidentReportClamavOnDemand() ? 'PENDING' : null;
    if (incidentReportClamavOnDemand()) {
      try {
        const verdict = await this.malwareScanner.scan(bytes);
        if (verdict === 'INFECTED') throw new BadRequestException('Fichier refusé : un logiciel malveillant a été détecté.');
        return 'CLEAN';
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        return 'PENDING';
      }
    }
    if (!process.env.INCIDENT_REPORT_CLAMAV_HOST?.trim()) return null;
    try {
      const verdict = await this.malwareScanner.scan(bytes);
      if (verdict === 'INFECTED') throw new BadRequestException('Fichier refusé : un logiciel malveillant a été détecté.');
      return 'CLEAN';
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      return null;
    }
  }

  private parseType(value: string): SupportType {
    if (!(SUPPORT_TYPES as readonly string[]).includes(value)) throw new BadRequestException('Type de demande invalide');
    return value as SupportType;
  }

  private parseImpact(value: string): SupportImpact {
    if (!(SUPPORT_IMPACTS as readonly string[]).includes(value)) throw new BadRequestException('Impact invalide');
    return value as SupportImpact;
  }

  private cleanText(value: unknown, min: number, max: number, label: string): string {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text.length < min) throw new BadRequestException(`${label} est trop court.`);
    if (text.length > max) throw new BadRequestException(`${label} dépasse ${max} caractères.`);
    return text;
  }

  /** Contexte technique : quelques champs courts seulement, jamais de jeton ni de contenu libre volumineux. */
  private cleanContext(context?: Record<string, unknown>) {
    if (!context || typeof context !== 'object') return null;
    const pick = (key: string, max: number) => {
      const value = context[key];
      return typeof value === 'string' ? value.slice(0, max) : undefined;
    };
    const page = pick('page', 300)?.replace(/[?#].*$/, '');
    return {
      page,
      userAgent: pick('userAgent', 300),
      appVersion: pick('appVersion', 60),
      viewport: pick('viewport', 30),
      language: pick('language', 20),
    };
  }
}
